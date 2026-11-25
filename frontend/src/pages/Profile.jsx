import { useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const PHONE_RE = /^\+?[0-9][0-9\s-]{8,14}[0-9]$/;
const MAX_DOC_BYTES = 5 * 1024 * 1024;

const VERIFICATION = {
  verified: { label: "Verified traveller", cls: "bg-emerald-600 text-white", icon: "✔" },
  pending: { label: "Verification pending", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200", icon: "⏳" },
  unverified: { label: "Not verified", cls: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200", icon: "•" },
};

// Mirrors backend/controllers/userController.js
function validate(form) {
  const e = {};
  const name = form.name.trim();
  if (name.length < 2 || name.length > 50) e.name = "Name must be 2–50 characters.";
  if (form.age !== "" && form.age !== null) {
    const age = Number(form.age);
    if (!Number.isInteger(age) || age < 13 || age > 100) e.age = "Age must be a whole number between 13 and 100.";
  }
  if (form.phoneNumber && !PHONE_RE.test(form.phoneNumber.trim())) e.phoneNumber = "Enter a valid phone number (10–15 digits).";
  if (form.medicalConditions.length > 500) e.medicalConditions = "Keep this under 500 characters.";
  return e;
}

export default function Profile() {
  const { user, setUser } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || "",
    age: user?.age ?? "",
    gender: user?.gender || "",
    bloodGroup: user?.bloodGroup || "",
    phoneNumber: user?.phoneNumber || "",
    medicalConditions: user?.medicalConditions || "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null); // { type, text }
  const [saving, setSaving] = useState(false);

  const [document, setDocument] = useState(null);
  const [documentType, setDocumentType] = useState("aadhaar");
  const [docMsg, setDocMsg] = useState(null);
  const [uploading, setUploading] = useState(false);

  const errors = validate(form);
  const show = (k) => submitted && errors[k];
  const verification = VERIFICATION[user?.verificationStatus] || VERIFICATION.unverified;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setProfileMsg(null);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      const res = await api.put("/users/me", {
        ...form,
        name: form.name.trim(),
        phoneNumber: form.phoneNumber.trim(),
        age: form.age === "" ? "" : Number(form.age),
      });
      setUser(res.data.user);
      setProfileMsg({ type: "success", text: res.data.message });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.response?.data?.message || "Profile update failed." });
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    setDocMsg(null);

    if (!document) return setDocMsg({ type: "error", text: "Please choose a file to upload." });
    if (!document.type.startsWith("image/") && document.type !== "application/pdf")
      return setDocMsg({ type: "error", text: "Upload an image or PDF of your document." });
    if (document.size > MAX_DOC_BYTES) return setDocMsg({ type: "error", text: "File must be 5 MB or smaller." });

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("document", document);
      formData.append("documentType", documentType);
      const res = await api.post("/users/me/verification-documents", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocMsg({ type: "success", text: res.data.message });
      setUser({ ...user, verificationStatus: "pending" });
      setDocument(null);
      e.target.reset();
    } catch (err) {
      setDocMsg({ type: "error", text: err.response?.data?.message || "Document upload failed." });
    } finally {
      setUploading(false);
    }
  };

  const inputCls = (k) => `input ${show(k) ? "input-error" : ""}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Header */}
      <div className="card overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-brand-600 to-teal-400" />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <div className="-mt-10 flex h-20 w-20 items-center justify-center rounded-2xl bg-white text-3xl font-extrabold text-brand-700 shadow-lg ring-4 ring-white dark:bg-slate-800 dark:text-brand-300 dark:ring-slate-900">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{user?.name}</h1>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
          <span className={`badge self-start sm:self-auto ${verification.cls}`}>
            {verification.icon} {verification.label}
          </span>
        </div>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSubmit} noValidate className="card card-pad mt-6 space-y-5">
        <div>
          <h2 className="section-title">Personal details</h2>
          <p className="hint">Shared with your trip organiser and used for emergencies.</p>
        </div>

        {profileMsg && (
          <div className={profileMsg.type === "success" ? "alert-success" : "alert-error"}>
            {profileMsg.type === "success" ? "✅" : "⚠️"} {profileMsg.text}
          </div>
        )}

        <div>
          <label htmlFor="name" className="label">Name</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} maxLength={50} className={inputCls("name")} />
          {show("name") && <p className="field-error">{errors.name}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="age" className="label">Age</label>
            <input id="age" type="number" name="age" min={13} max={100} value={form.age} onChange={handleChange} className={inputCls("age")} />
            {show("age") && <p className="field-error">{errors.age}</p>}
          </div>
          <div>
            <label htmlFor="gender" className="label">Gender</label>
            <select id="gender" name="gender" value={form.gender} onChange={handleChange} className="input">
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label htmlFor="bloodGroup" className="label">Blood group</label>
            <select id="bloodGroup" name="bloodGroup" value={form.bloodGroup} onChange={handleChange} className="input">
              <option value="">Select</option>
              {BLOOD_GROUPS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="phoneNumber" className="label">Phone number</label>
          <input
            id="phoneNumber"
            type="tel"
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={handleChange}
            placeholder="+91 98765 43210"
            maxLength={18}
            className={inputCls("phoneNumber")}
          />
          {show("phoneNumber") && <p className="field-error">{errors.phoneNumber}</p>}
        </div>

        <div>
          <label htmlFor="medicalConditions" className="label">
            Medical conditions <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="medicalConditions"
            name="medicalConditions"
            rows={3}
            value={form.medicalConditions}
            onChange={handleChange}
            maxLength={500}
            placeholder="Allergies, asthma, medication… helps in an emergency."
            className={inputCls("medicalConditions")}
          />
          <p className="hint text-right">{form.medicalConditions.length}/500</p>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>

      {/* Verification */}
      <form onSubmit={handleDocumentUpload} noValidate className="card card-pad mt-6 space-y-5">
        <div>
          <h2 className="section-title">Identity verification</h2>
          <p className="hint">Verified travellers get a trust badge, so organisers accept their join requests faster.</p>
        </div>

        {docMsg && (
          <div className={docMsg.type === "success" ? "alert-success" : "alert-error"}>
            {docMsg.type === "success" ? "✅" : "⚠️"} {docMsg.text}
          </div>
        )}

        {user?.verificationStatus === "verified" ? (
          <div className="alert-success">✔ Your identity is verified.</div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="documentType" className="label">Document type</label>
                <select id="documentType" value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="input">
                  <option value="aadhaar">Aadhaar</option>
                  <option value="passport">Passport</option>
                  <option value="driving_license">Driving licence</option>
                </select>
              </div>
              <div>
                <label htmlFor="document" className="label">Document (image or PDF, max 5 MB)</label>
                <input
                  id="document"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setDocument(e.target.files[0] || null)}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
                />
              </div>
            </div>
            <button type="submit" disabled={uploading || user?.verificationStatus === "pending"} className="btn-secondary">
              {uploading
                ? "Uploading…"
                : user?.verificationStatus === "pending"
                ? "⏳ Under review"
                : "Upload for verification"}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
