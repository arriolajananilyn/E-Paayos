import mongoose from "mongoose"
import bcrypt from "bcryptjs"

/** Stored in DB so admin previews work even when disk uploads are missing or on another machine. */
const embeddedFileSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, default: "application/octet-stream" },
  },
  { _id: false }
)

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["shop-owner", "oncall-mechanic-technician", "mechanic-technician", "customer", "admin"],
      required: true,
    },
    fullName: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "prefer-not"], required: true },
    birthdate: { type: Date, required: true },
    civilStatus: {
      type: String,
      enum: ["single", "married", "widowed", "separated"],
      required: function () {
        return (
          this.role === "mechanic-technician" ||
          this.role === "shop-owner" ||
          this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
        )
      },
    },

    // Mechanic/Technician personal info
    lastName: {
      type: String,
      required: function () {
        return (
          this.role === "mechanic-technician" ||
          this.role === "shop-owner" ||
          this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
        )
      },
    },
    firstName: {
      type: String,
      required: function () {
        return (
          this.role === "mechanic-technician" ||
          this.role === "shop-owner" ||
          this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
        )
      },
    },
    middleName: { type: String },

    pobRegion: {
      type: String,
      required: function () {
        return (
          this.role === "mechanic-technician" ||
          this.role === "shop-owner" ||
          this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
        )
      },
    },
    pobProvince: {
      type: String,
      required: function () {
        return (
          this.role === "mechanic-technician" ||
          this.role === "shop-owner" ||
          this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
        )
      },
    },
    pobCityMunicipality: {
      type: String,
      required: function () {
        return (
          this.role === "mechanic-technician" ||
          this.role === "shop-owner" ||
          this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
        )
      },
    },
    pobBarangay: {
      type: String,
      required: function () {
        return (
          this.role === "mechanic-technician" ||
          this.role === "shop-owner" ||
          this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
        )
      },
    },

    region: { type: String, required: true },
    province: { type: String, required: true },
    cityMunicipality: { type: String, required: true },
    barangay: { type: String, required: true },
    detailedAddress: { type: String, default: "" },
    postalCode: { type: String },
    phoneCode: { type: String, default: "+63" },
    phoneNumber: { type: String, required: true },

    permanentRegion: {
      type: String,
      required: function () {
        return (
          this.role === "mechanic-technician" ||
          this.role === "shop-owner" ||
          this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
        )
      },
    },
    permanentProvince: {
      type: String,
      required: function () {
        return (
          this.role === "mechanic-technician" ||
          this.role === "shop-owner" ||
          this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
        )
      },
    },
    permanentCityMunicipality: {
      type: String,
      required: function () {
        return (
          this.role === "mechanic-technician" ||
          this.role === "shop-owner" ||
          this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
        )
      },
    },
    permanentBarangay: {
      type: String,
      required: function () {
        return (
          this.role === "mechanic-technician" ||
          this.role === "shop-owner" ||
          this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
        )
      },
    },

    employmentStatusCategory: {
      type: String,
      enum: ["employed", "unemployed"],
      required: function () {
        return (
          this.role === "mechanic-technician" ||
          this.role === "shop-owner" ||
          this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
        )
      },
    },
    employmentStatusDetail: {
      type: String,
      required: function () {
        return (
          this.role === "mechanic-technician" ||
          this.role === "shop-owner" ||
          this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
        )
      },
    },

    // Mechanic/Technician educational background
    highestEducationalLevel: {
      type: String,
      enum: [
        "No formal education",
        "Elementary Level",
        "Elementary Graduate",
        "Highschool Level",
        "Highschool Graduate",
        "College level",
        "College Graduate",
        "Technical-Vocational graduate",
        "Post Graduate",
      ],
      required: function () {
        return this.role === "mechanic-technician" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },
    yearGraduatedLastAttended: {
      type: String,
    },
    schoolUniversity: {
      type: String,
      required: function () {
        return this.role === "mechanic-technician" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },
    courseProgram: {
      type: String,
      required: function () {
        return this.role === "mechanic-technician" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },

    // Shop Owner business / shop information
    shopName: {
      type: String,
      required: function () {
        return this.role === "shop-owner"
      },
    },
    businessType: {
      type: String,
      enum: ["Sole Proprietorship", "Partnership", "Corporation"],
      required: function () {
        return this.role === "shop-owner" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },
    repairServicesOffered: {
      type: [String],
      default: [],
      required: function () {
        return this.role === "shop-owner" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },
    serviceType: {
      type: String,
      enum: ["Home Service", "Shop Visit", "Both"],
      required: function () {
        return this.role === "shop-owner" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },
    yearsOfOperation: {
      type: Number,
      required: function () {
        return this.role === "shop-owner" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },
    numberOfEmployees: {
      type: Number,
      required: function () {
        return this.role === "shop-owner"
      },
    },
    laborRatingMin: {
      type: Number,
      min: 0,
    },
    laborRatingMax: {
      type: Number,
      min: 0,
    },
    operatingHours: {
      type: String,
      required: function () {
        return this.role === "shop-owner" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },
    daysOfOperation: {
      type: [String],
      default: [],
      required: function () {
        return this.role === "shop-owner" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },
    shopDescription: { type: String },
    /** When enabled, the virtual shop assistant auto-replies to customer inquiries when provider is away */
    aiAutoReplyEnabled: { type: Boolean, default: true },

    // Shop Owner shop location & facilities
    shopRegion: {
      type: String,
      required: function () {
        return this.role === "shop-owner" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },
    shopProvince: {
      type: String,
      required: function () {
        return this.role === "shop-owner" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },
    shopCityMunicipality: {
      type: String,
      required: function () {
        return this.role === "shop-owner" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },
    shopBarangay: {
      type: String,
      required: function () {
        return this.role === "shop-owner" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },
    shopDetailedAddress: {
      type: String,
      default: "",
    },
    shopLandmark: { type: String },
    /** Public photo of the shop or business place (data URL, `/uploads/shop-place/...`, or https URL). */
    shopPlacePhoto: { type: String, default: "" },
    // removed: availableEquipment/specialization (per requirement)

    // Shop Owner business registration details
    dtiSecRegistrationNumber: {
      type: String,
      required: function () {
        return this.role === "shop-owner"
      },
    },
    businessPermitNumber: {
      type: String,
      required: function () {
        return this.role === "shop-owner"
      },
    },
    tinNumber: { type: String },
    /** Legacy disk path; shop owners may use businessPermitCertificateImage instead. */
    businessPermitCertificatePath: { type: String },

    // Mechanic/Technician work experience
    workCompanyName: {
      type: String,
      required: function () {
        return this.role === "mechanic-technician"
      },
    },
    workCompanyAddress: {
      type: String,
      required: function () {
        return this.role === "mechanic-technician"
      },
    },
    workPositionHeld: {
      type: String,
      required: function () {
        return this.role === "mechanic-technician"
      },
    },
    workInclusiveFrom: {
      type: String,
      required: function () {
        return this.role === "mechanic-technician"
      },
    },
    workInclusiveTo: {
      type: String,
      required: function () {
        return this.role === "mechanic-technician"
      },
    },
    workAppointmentStatus: {
      type: String,
      required: function () {
        return this.role === "mechanic-technician"
      },
    },

    // Mechanic/Technician 21st century skills
    skillsSelfAssessment: {
      type: [String],
      default: [],
      required: function () {
        return this.role === "mechanic-technician" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },

    // Mechanic/Technician technical skills (no formal training)
    technicalSkillsNoFormalTraining: {
      type: [String],
      default: [],
      required: function () {
        return this.role === "mechanic-technician" || this.role === "oncall-mechanic-technician" || this.role === "independent-mechanic-technician"
      },
    },

    employedByShopOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    /** Set by shop owner on Manage Employee (optional job title label). */
    shopJobTitle: { type: String, default: "", trim: true, maxlength: 120 },
    /** Roster status managed by the employing shop owner. */
    shopManagedStatus: {
      type: String,
      enum: ["active", "on-leave", "inactive"],
      default: "active",
    },
    /** Aggregate customer feedback for service providers (shop-owner / oncall-mechanic-technician). */
    providerRatingAvg: { type: Number, default: 0, min: 0, max: 5 },
    providerRatingCount: { type: Number, default: 0, min: 0 },
    acceptedPaymentMethods: {
      type: [
        {
          id: { type: String, required: true, trim: true },
          type: { type: String, enum: ["gcash", "maya", "cash_on_service"], required: true },
          accountName: { type: String, default: "", trim: true, maxlength: 200 },
          details: { type: String, default: "", trim: true, maxlength: 500 },
          notes: { type: String, default: "", trim: true, maxlength: 500 },
          qrImage: { type: String, default: "", trim: true },
        },
      ],
      default: [],
    },
    warrantySettings: {
      laborWarrantyEnabled: { type: Boolean, default: true },
      laborWarrantyDays: { type: Number, default: 30 },
      partsWarrantyEnabled: { type: Boolean, default: true },
      partsWarrantyDays: { type: Number, default: 90 },
      warrantyPolicyTerms: { type: String, default: "" },
      coveredItems: {
        type: [
          {
            id: { type: String, required: true },
            text: { type: String, required: true },
            active: { type: Boolean, default: true },
          },
        ],
        default: [],
      },
      voidConditions: {
        type: [
          {
            id: { type: String, required: true },
            text: { type: String, required: true },
            active: { type: Boolean, default: true },
          },
        ],
        default: [],
      },
    },

    /** Service and delivery addresses saved by customer accounts */
    deliveryAddresses: {
      type: [
        {
          id: { type: String, required: true },
          label: { type: String, default: "Home" },
          recipient: { type: String, default: "" },
          phone: { type: String, default: "" },
          street: { type: String, default: "" },
          barangay: { type: String, default: "" },
          city: { type: String, default: "Boac" },
          province: { type: String, default: "Marinduque" },
          postalCode: { type: String, default: "4900" },
          type: { type: String, default: "Home" },
          isDefault: { type: Boolean, default: false },
        },
      ],
      default: [],
    },

    /** Payment methods linked by customer accounts */
    customerPaymentMethods: {
      type: [
        {
          id: { type: String, required: true },
          type: { type: String, required: true },
          accountName: { type: String, default: "" },
          accountNumber: { type: String, default: "" },
          isDefault: { type: Boolean, default: false },
          badgeColor: { type: String, default: "" },
        },
      ],
      default: [],
    },

    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, required: true },

    /** Self-serve sign-ups need admin approval before login (admin role exempt). Legacy users without this field are treated as approved. */
    accountApprovalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    approvalRejectionReason: { type: String, default: "" },

    /** Progressive discipline & moderation system (managed by Admin) */
    moderationStatus: {
      type: String,
      enum: ["active", "warned", "restricted"],
      default: "active",
      index: true,
    },
    warningCount: { type: Number, default: 0, min: 0 },
    warnings: {
      type: [
        {
          referenceCode: { type: String, required: true, trim: true },
          warningNumber: { type: Number, required: true, min: 1 },
          severity: {
            type: String,
            enum: ["minor", "moderate", "severe", "final_warning"],
            default: "moderate",
          },
          category: {
            type: String,
            enum: [
              "warranty_violation",
              "overcharging",
              "poor_service",
              "damage_property",
              "late_no_show",
              "unprofessional_behavior",
              "scam_fraud",
              "harassment",
              "fake_booking",
              "non_payment",
              "abusive_customer",
              "policy_violation",
              "other",
            ],
            default: "policy_violation",
          },
          title: { type: String, required: true, trim: true, maxlength: 200 },
          reason: { type: String, required: true, trim: true, maxlength: 3000 },
          correctiveAction: { type: String, default: "", trim: true, maxlength: 1500 },
          relatedComplaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", default: null },
          relatedTicketNumber: { type: String, default: "", trim: true, maxlength: 60 },
          issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
          issuedByName: { type: String, default: "E-Paayos Administrator", trim: true },
          issuedAt: { type: Date, default: Date.now },
          acknowledged: { type: Boolean, default: false },
          acknowledgedAt: { type: Date, default: null },
          acknowledgmentNote: { type: String, default: "", trim: true, maxlength: 1000 },
        },
      ],
      default: [],
    },
    restrictedAt: { type: Date, default: null },
    restrictedUntil: { type: Date, default: null },
    restrictionReason: { type: String, default: "", trim: true, maxlength: 3000 },
    restrictionCategory: { type: String, default: "", trim: true, maxlength: 120 },
    restrictionRelatedTicket: { type: String, default: "", trim: true, maxlength: 60 },
    restrictedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    restrictedByName: { type: String, default: "", trim: true },
    appeals: {
      type: [
        {
          appealRef: { type: String, required: true, trim: true },
          restrictionStartedAt: { type: Date, default: null },
          subject: { type: String, required: true, trim: true, maxlength: 200 },
          reason: { type: String, required: true, trim: true, maxlength: 3000 },
          evidencePhotos: [{ type: String, trim: true }],
          status: {
            type: String,
            enum: ["submitted", "under_review", "approved", "rejected"],
            default: "submitted",
          },
          submittedAt: { type: Date, default: Date.now },
          reviewStartedAt: { type: Date, default: null },
          reviewedAt: { type: Date, default: null },
          reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
          reviewedByName: { type: String, default: "", trim: true },
          adminRemarks: { type: String, default: "", trim: true, maxlength: 2000 },
          decisionAcknowledged: { type: Boolean, default: false },
          decisionAcknowledgedAt: { type: Date, default: null },
        },
      ],
      default: [],
    },
    moderationLogs: {
      type: [
        {
          action: {
            type: String,
            enum: [
              "warned",
              "warning_acknowledged",
              "restricted",
              "restriction_lifted",
              "standing_cleared",
              "appeal_submitted",
              "appeal_reviewing",
              "appeal_approved",
              "appeal_rejected",
            ],
            required: true,
          },
          summary: { type: String, required: true, trim: true },
          details: { type: String, default: "", trim: true },
          relatedTicketNumber: { type: String, default: "", trim: true },
          actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
          actorName: { type: String, default: "", trim: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    resetPasswordOtp: { type: String },
    resetPasswordOtpExpire: { type: Date },

    idType: { type: String, required: true },
    validIdPath: { type: String }, // legacy disk path
    selfiePath: { type: String },
    validIdImage: embeddedFileSchema,
    selfieImage: embeddedFileSchema,
    businessPermitCertificateImage: embeddedFileSchema,
  },
  { timestamps: true }
)

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.matchPassword = async function (enteredPassword) {
  const stored = String(this.password || "")
  const entered = String(enteredPassword || "")

  // Normal path: bcrypt hash in DB.
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    return bcrypt.compare(entered, stored)
  }

  // Backward-compat: accept legacy plain-text passwords, then migrate on login.
  return entered === stored
}

export const User = mongoose.model("User", userSchema)

