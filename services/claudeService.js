const Groq = require("groq-sdk");

// Using Groq free API (https://console.groq.com)
// Model: llama3-70b-8192 (fast + free)
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function processMessage(
  userMessage,
  inventoryContext,
  salesSummaryContext,
  shopName,
  language,
) {
  const langInstruction =
    language === "hindi"
      ? `IMPORTANT LANGUAGE RULE: You MUST respond ONLY in Hindi (Devanagari script).
- Use natural, conversational Hindi that a local kirana shop owner would understand
- Use common Hindi business terms: "बिक्री" (sales), "मुनाफा" (profit), "आय" (revenue), "खर्च" (cost)
- Be warm and friendly like a helpful assistant
- When mentioning numbers, use Hindi format: "₹500" or "500 रुपये"
- NEVER respond in English or mix English words unnecessarily`
      : language === "gujarati"
        ? `IMPORTANT LANGUAGE RULE: You MUST respond ONLY in Gujarati (Gujarati script).
- Use natural, conversational Gujarati that a local shop owner would understand
- Use common Gujarati business terms: "વેચાણ" (sales), "નફો" (profit), "આવક" (revenue), "ખર્ચ" (cost)
- Be warm and friendly like a helpful assistant
- When mentioning numbers, use Gujarati format: "₹500" or "500 રૂપિયા"
- NEVER respond in English or mix English words unnecessarily`
        : `IMPORTANT LANGUAGE RULE: You MUST respond ONLY in clear, professional English.
- Use simple business English that a small shop owner would understand
- Be professional yet friendly
- Use proper currency format: "₹500" or "Rs. 500"`;

  // Trim inventory context to stay within token limits (e.g., top 100 items)
  const trimmedInventory = (inventoryContext || []).slice(0, 100);

  const systemPrompt = `You are InventIQ, a smart AI assistant for "${shopName}", a small Indian kirana/general store.
${langInstruction}

Current inventory (JSON):
${JSON.stringify(trimmedInventory, null, 2)}

Sales Summary Data (Recent):
${JSON.stringify(salesSummaryContext || {}, null, 2)}

Actions You Can Take:
1. UPDATE_INVENTORY - when owner mentions single/few stock changes
2. LOW_STOCK_CHECK - when owner asks about items running out
3. GENERATE_OFFER - when owner wants promotional WhatsApp text
4. SALES_SUMMARY - reporting
5. ADD_ITEM - for adding one or more completely new products (including bulk JSON/CSV strings)
6. UPDATE_PRICE - price/GST changes
7. NONE - general chat

Bulk Data Handling:
- If the user provides a list, JSON array, or CSV-like string of items:
  1. Parse the data carefully.
  2. Map fields to our internal format: "itemName" or "item" -> "name"; "stock" or "qty" -> "quantity"; "gst" -> "gstRate".
  3. Ensure "price" is numerical.
  4. Use ADD_ITEM action and put the array of items in "data.newItems".

Your Reporting Logic (SALES_SUMMARY):
- **REVENUE vs PROFIT - CRITICAL DIFFERENCE**:
  - Revenue (आय/આવક) = Total money from sales (selling price × quantity) - This is what customers paid
  - Profit (मुनाफा/નફો) = Revenue minus cost price (what you paid to buy the stock) - This is your actual earnings
  - Example: You bought rice at ₹40/kg, sold at ₹50/kg. Revenue = ₹50, Profit = ₹10
- Revenue reporting must be accurate and consistent with system reports.
- If user asks for "today's revenue" or "today's sales", refer to "todaySales".
- If user asks for "today's profit", refer to "todayProfit".
- If user asks for "weekly revenue", refer to "weeklySales".
- If user asks for "weekly profit", refer to "weeklyProfit".
- If user asks for "total revenue", refer to "totalSales".
- If user asks for "total profit", refer to "totalProfit".
- **CRITICAL**: Revenue and Profit are DIFFERENT numbers. Never report them as the same.
- Format: "आज की बिक्री: ₹X | मुनाफा: ₹Y | यूनिट: Z" (Hindi) OR "Today's Sales: ₹X | Profit: ₹Y | Units: Z" (English) OR "આજનું વેચાણ: ₹X | નફો: ₹Y | યુનિટ: Z" (Gujarati).

Inventory Status & Low Stock Logic (LOW_STOCK_CHECK):
- **General Stock Query**: If user asks "What's low?", "Show alerts", or "What should I buy?", use action "LOW_STOCK_CHECK".
- **Identification**:
  - **Low Stock**: Any item where 'lowStock: true'. Mention the quantity and threshold.
  - **Out of Stock**: Any item where 'quantity: 0'. These are CRITICAL.
- **Language-Specific Phrases**:
  - **Hindi**: Use "स्टॉक कम है", "खत्म हो गया", "ऑर्डर करना होगा", "बस X बचा है"
  - **Gujarati**: Use "સ્ટોક ઓછો છે", "ખતમ થઈ ગયું", "ઓર્ડર કરવું પડશે", "ફક્ત X બચ્યું છે"
  - **English**: Use "Stock running low", "Out of stock", "Need to reorder", "Only X left"
- **Reorder Suggestions**: After listing low items, suggest ordering in the appropriate language.

Bulk Data Handling:
- **CRITICAL**: If the user says "sold", "minus", "out", or "remove", set "change" to a **NEGATIVE** number (e.g., "2 sold" -> "change": -2, "type": "add" or "remove").
- If the user says "added", "purchased", or "bought", set "change" to a **POSITIVE** number.
- For SETTING a value (e.g., "set stock to 20"), set "change": 20 and "type": "set".
- Default action for inventory changes: UPDATE_INVENTORY.


IMPORTANT: Always respond with valid JSON ONLY — no extra text, no markdown:
{
  "reply": "Your friendly response in the appropriate language (e.g. 'I have added 25 items to your inventory!')",
  "action": "UPDATE_INVENTORY|LOW_STOCK_CHECK|GENERATE_OFFER|SALES_SUMMARY|ADD_ITEM|UPDATE_PRICE|NONE",
  "data": {
    "items": [{"name": "item name", "change": number, "type": "add|remove|set", "gstRate": number, "isPacked": boolean}],
    "prices": [{"name": "item name", "price": number}],
    "offerText": "WhatsApp message text if action is GENERATE_OFFER",
    "newItem": {"name": "", "brandName": "", "category": "General", "quantity": 0, "packSize": "", "unit": "pcs", "mrp": 0, "price": 0, "purchasePrice": 0, "gstRate": 0, "hsnCode": "", "isPacked": true},
    "newItems": [{"name": "", "category": "General", "quantity": 0, "price": 0, "gstRate": 0, "unit": "pcs", "isPacked": true}]
  }
}
`;

  console.log(
    `[AI] Processing message: "${userMessage}" (Inventory size: ${trimmedInventory.length})`,
  );

  let response;
  try {
    response = await client.chat.completions.create({
      model: "llama-3.1-8b-instant", // More stable TPM limits
      max_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
    });
  } catch (err) {
    if (err.message.includes("rate_limit_exceeded")) {
      console.error("[AI] Rate limit hit. Context size was too large.");
    }
    console.error("[AI] Groq Request Failed:", err.message);
    throw new Error("AI service busy. Please try again in a few seconds.");
  }

  const text = response.choices[0].message.content;
  console.log("[AI] Raw response:", text);

  try {
    const clean = text.replace(/```json|```/g, "").trim();
    // Use a more aggressive regex to find the first '{' and last '}'
    const startIndex = clean.indexOf("{");
    const endIndex = clean.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1) {
      throw new Error("No JSON object found in response");
    }

    const jsonStr = clean.substring(startIndex, endIndex + 1);
    const parsed = JSON.parse(jsonStr);

    console.log("[AI] Parsed action:", parsed.action);
    return parsed;
  } catch (err) {
    console.error("[AI] JSON Parsing Failed:", err.message);
    console.error("[AI] Raw text that failed parsing:", text);
    // Don't return the raw AI text if it's an error message from the model
    const isModelError =
      text.toLowerCase().includes("trouble") ||
      text.toLowerCase().includes("rephrase") ||
      text.toLowerCase().includes("sorry") ||
      text.toLowerCase().includes("cannot");
    return {
      reply: isModelError
        ? "Maaf kijiye, main samajh nahi paaya. Kripya dobara boliye. (Sorry, I didn't understand. Please try again.)"
        : text ||
          "Main aapki madad karta hoon. Aap stock update, low stock check, ya offer banana ke liye kuch bhi pooch sakte hain.",
      action: "NONE",
      data: {},
    };
  }
}

module.exports = { processMessage };
