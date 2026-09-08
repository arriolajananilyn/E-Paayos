import { GoogleGenerativeAI } from "@google/generative-ai"
import { User } from "../models/userModel.js"
import { ShopService } from "../models/shopServiceModel.js"
import { Booking } from "../models/bookingModel.js"
import { Message } from "../models/messageModel.js"
import { Conversation } from "../models/conversationModel.js"

let genAI = null

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey && apiKey.length > 10 && apiKey !== "your_gemini_api_key_here") {
      genAI = new GoogleGenerativeAI(apiKey)
    }
  }
  return genAI
}

const PRIMARY_MODEL = "gemini-3.5-flash"
const FALLBACK_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
]

/**
 * Gather rich, localized shop context for the specific provider in conversation.
 */
export async function getShopAiContext(providerId, customerId) {
  const provider = await User.findById(providerId).lean()
  if (!provider) return null

  // If mechanic is employed under a shop owner, look up the shop owner for services catalog
  let effectiveShopOwner = provider
  if (provider.role === "mechanic-technician" && provider.employedByShopOwner) {
    const parentOwner = await User.findById(provider.employedByShopOwner).lean()
    if (parentOwner) effectiveShopOwner = parentOwner
  }

  const shopName =
    effectiveShopOwner.shopName ||
    provider.shopName ||
    effectiveShopOwner.fullName ||
    provider.fullName ||
    "Repair Service"

  const ownerName = effectiveShopOwner.fullName || provider.fullName || "Service Provider"
  const role = provider.role

  const addressParts = [
    effectiveShopOwner.shopDetailedAddress,
    effectiveShopOwner.shopBarangay,
    effectiveShopOwner.shopCityMunicipality,
    effectiveShopOwner.shopProvince,
    effectiveShopOwner.shopRegion,
  ].filter(Boolean)

  const fullAddress = addressParts.length ? addressParts.join(", ") : "Available upon request / in-app"
  const landmark = effectiveShopOwner.shopLandmark || ""

  const operatingHours =
    effectiveShopOwner.operatingHours || provider.operatingHours || "Regular business hours"

  const daysOfOperation =
    Array.isArray(effectiveShopOwner.daysOfOperation) && effectiveShopOwner.daysOfOperation.length
      ? effectiveShopOwner.daysOfOperation.join(", ")
      : Array.isArray(provider.daysOfOperation) && provider.daysOfOperation.length
      ? provider.daysOfOperation.join(", ")
      : "Monday to Saturday"

  const description = effectiveShopOwner.shopDescription || provider.shopDescription || ""
  const laborMin = effectiveShopOwner.laborRatingMin ?? provider.laborRatingMin ?? null
  const laborMax = effectiveShopOwner.laborRatingMax ?? provider.laborRatingMax ?? null

  // Query catalog of services
  const services = await ShopService.find({
    shopOwner: effectiveShopOwner._id,
    status: "active",
  })
    .select("name category subcategory description location startingPrice laborRatingMin laborRatingMax requirements")
    .limit(15)
    .lean()

  // Query customer's active / recent bookings with this shop
  let customerBookings = []
  if (customerId) {
    customerBookings = await Booking.find({
      customer: customerId,
      shopOwner: effectiveShopOwner._id,
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate("shopService", "name category")
      .lean()
  }

  return {
    providerId: String(provider._id),
    shopOwnerId: String(effectiveShopOwner._id),
    shopName,
    ownerName,
    role,
    fullAddress,
    landmark,
    operatingHours,
    daysOfOperation,
    description,
    laborRange: laborMin || laborMax ? `₱${laborMin || 0} - ₱${laborMax || 0}` : null,
    services: services.map((s) => ({
      name: s.name,
      category: s.category,
      mode: s.location, // 'home', 'in-shop', 'both'
      startingPrice: s.startingPrice ? `₱${s.startingPrice.toLocaleString()}` : null,
      description: s.description,
    })),
    recentBookings: customerBookings.map((b) => ({
      bookingId: String(b._id),
      serviceName: b.shopService?.name || "Repair Service",
      status: b.status,
      date: b.preferredDate ? new Date(b.preferredDate).toLocaleDateString() : "—",
      time: b.preferredTime || "—",
    })),
  }
}

/**
 * Intelligent rule-based fallback response if Gemini API is unavailable or quota is exceeded.
 */
function generateLocalFallbackReply(context, userQuery) {
  const query = (userQuery || "").toLowerCase()
  const shop = context.shopName
  const owner = context.ownerName

  if (query.includes("oras") || query.includes("hour") || query.includes("bukas") || query.includes("open") || query.includes("schedule") || query.includes("araw")) {
    return `Magandang araw! Ako po ang Virtual Assistant ng ${shop}. Ang aming operating hours ay ${context.operatingHours} (${context.daysOfOperation}). Kasalukuyan pong abala o offline si ${owner}, ngunit maaari po kayong mag-iwan ng mensahe o mag-book ng service sa E-Paayos.`
  }

  if (query.includes("saan") || query.includes("location") || query.includes("address") || query.includes("lugar") || query.includes("landmark")) {
    let loc = `Ang lokasyon po ng ${shop} ay matatagpuan sa: ${context.fullAddress}.`
    if (context.landmark) loc += ` Landmark: ${context.landmark}.`
    return `${loc} Babalikan po kayo ni ${owner} sa lalong madaling panahon!`
  }

  if (query.includes("presyo") || query.includes("price") || query.includes("rate") || query.includes("magkano") || query.includes("serbisyo") || query.includes("service")) {
    if (context.services && context.services.length > 0) {
      const topServices = context.services.slice(0, 4)
      const list = topServices
        .map((s) => `• ${s.name}${s.startingPrice ? ` (Magsisimula sa ${s.startingPrice})` : ""}`)
        .join("\n")
      return `Narito po ang ilan sa mga serbisyo ng ${shop}:\n${list}\n\nKasalukuyan pong abala si ${owner}, ngunit maaari po kayong pumili at mag-book sa aming page sa E-Paayos!`
    }
    if (context.laborRange) {
      return `Ang labor fee range po sa ${shop} ay karaniwang ${context.laborRange} depende sa sira at serbisyo. Mag-iwan lamang po ng detalye ng inyong ipapaayos at sasagutin kayo ni ${owner}.`
    }
  }

  if (query.includes("booking") || query.includes("status") || query.includes("appointment")) {
    if (context.recentBookings && context.recentBookings.length > 0) {
      const b = context.recentBookings[0]
      return `Tungkol po sa inyong booking para sa "${b.serviceName}": Ang status po nito ay "${b.status.toUpperCase()}" na nakatakda para sa ${b.date} (${b.time}). Babalikan din po kayo ni ${owner} para sa karagdagang detalye.`
    }
  }

  return `Kumusta po! Ako po ang AI Virtual Assistant ng ${shop}. Kasalukuyan pong offline o abala si ${owner}, ngunit natanggap po namin ang inyong mensahe. Maaari po kayong magtanong tungkol sa aming mga serbisyo, presyo, schedule, o lokasyon, at babalikan din po kayo ni ${owner} sa lalong madaling panahon. 🔧`
}

/**
 * Generate a context-aware AI auto-reply for customer direct messages.
 */
export async function generateShopAiReply({
  conversationId,
  customerId,
  providerId,
  incomingMessageText,
}) {
  try {
    const context = await getShopAiContext(providerId, customerId)
    if (!context) return null

    // Load recent message history in this conversation for flow
    const recentMsgs = await Message.find({ conversation: conversationId })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean()

    const historyReversed = recentMsgs.reverse()

    const servicesSummary = context.services.length
      ? context.services
          .map((s) => `- ${s.name} (${s.category}, Mode: ${s.mode}${s.startingPrice ? `, From ${s.startingPrice}` : ""}): ${s.description}`)
          .join("\n")
      : "General repair and inspection services."

    const bookingsSummary = context.recentBookings.length
      ? context.recentBookings
          .map((b) => `- Service: ${b.serviceName} | Status: ${b.status} | Date: ${b.date} ${b.time}`)
          .join("\n")
      : "No current active bookings found for this customer."

    const systemPrompt = `You are the friendly, polite, and professional AI Virtual Assistant of "${context.shopName}", owned/managed by "${context.ownerName}" on the E-Paayos platform.

## Your Context & Knowledge (Strictly for this shop only):
- Shop Name: ${context.shopName}
- Provider / Owner Name: ${context.ownerName}
- Address / Location: ${context.fullAddress} ${context.landmark ? `(Landmark: ${context.landmark})` : ""}
- Operating Hours: ${context.operatingHours}
- Days of Operation: ${context.daysOfOperation}
- Shop Description: ${context.description || "Trusted service provider on E-Paayos."}
- Labor Range: ${context.laborRange || "Custom quote depending on inspection"}
- Available Services:
${servicesSummary}
- Customer's Bookings with this shop:
${bookingsSummary}

## Instructions & Behavior:
1. The real owner/technician (${context.ownerName}) is currently busy or offline. You are sending an automated, helpful reply in their direct message thread.
2. Only provide facts and services that belong to "${context.shopName}". Never invent services or other shops.
3. Language: Match the customer's language (Tagalog, Taglish, or English). Keep it warm, polite, and natural.
4. If the customer asks about rates or services, provide the real starting prices or details listed above.
5. If the customer asks to book, politely remind them that they can select the service and click "Book Now" on E-Paayos.
6. Assure the customer that ${context.ownerName} has received their message and will follow up personally when available.
7. Keep responses concise, helpful, and easily readable on mobile screens (1 to 3 short paragraphs max).`

    let aiText = ""
    const ai = getGenAI()

    if (ai) {
      const contents = []
      for (const m of historyReversed) {
        const isFromCustomer = String(m.sender) === String(customerId)
        contents.push({
          role: isFromCustomer ? "user" : "model",
          parts: [{ text: m.content || "(Attachment sent)" }],
        })
      }

      // Ensure last item is the user's latest query
      if (!contents.length || contents[contents.length - 1].role !== "user") {
        contents.push({
          role: "user",
          parts: [{ text: incomingMessageText || "Hello" }],
        })
      }

      const modelsToTry = [PRIMARY_MODEL, ...FALLBACK_MODELS]
      for (const modelName of modelsToTry) {
        try {
          const model = ai.getGenerativeModel({
            model: modelName,
            systemInstruction: systemPrompt,
          })
          const result = await model.generateContent({ contents })
          aiText = result.response.text().trim()
          if (aiText) break
        } catch (err) {
          console.warn(`[ShopAiService] Model ${modelName} error (${err.message}). Trying fallback...`)
        }
      }
    }

    // Fall back to rule-based contextual reply if Gemini was unreachable
    if (!aiText) {
      aiText = generateLocalFallbackReply(context, incomingMessageText)
    }

    // Persist the AI response in the conversation
    const aiMsg = await Message.create({
      conversation: conversationId,
      sender: providerId,
      content: aiText,
      isAiGenerated: true,
    })

    const lastAt = aiMsg.createdAt || new Date()
    await Conversation.updateOne(
      { _id: conversationId },
      {
        $set: {
          lastMessageAt: lastAt,
          lastMessagePreview: aiText.slice(0, 500),
          lastSender: providerId,
        },
      }
    )

    return {
      _id: String(aiMsg._id),
      content: aiText,
      createdAt: lastAt.toISOString(),
      fromMe: false,
      isAiGenerated: true,
      attachments: [],
    }
  } catch (error) {
    console.error("[ShopAiService] Failed to generate shop AI reply:", error)
    return null
  }
}
