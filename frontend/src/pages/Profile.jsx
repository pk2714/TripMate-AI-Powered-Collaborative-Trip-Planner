import { useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  const { user, setUser } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || "",
    age: user?.age || "",
    gender: user?.gender || "",
    bloodGroup: user?.bloodGroup || "",
    phoneNumber: user?.phoneNumber || "",
    medicalConditions: user?.medicalConditions || "",
  });

  const [message, setMessage] = useState("");

  // Verification document states
  const [document, setDocument] = useState(null);
  const [documentType, setDocumentType] = useState("aadhaar");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // Update Profile
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await api.put("/users/me", form);

      setUser(res.data.user);
      setMessage(res.data.message);
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "Profile update failed."
      );
    }
  };

  // Upload Verification Document
  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!document) {
      return setMessage("Please select a document.");
    }

    try {
      const formData = new FormData();

      formData.append("document", document);
      formData.append("documentType", documentType);

      const res = await api.post(
        "/users/me/verification-documents",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessage(res.data.message);
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "Document upload failed."
      );
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold mb-2">
          {user?.name}
        </h1>

        <p className="text-gray-500 mb-6">
          Verification Status :{" "}
          <span className="capitalize font-medium">
            {user?.verificationStatus}
          </span>
        </p>

        {message && (
          <p className="mb-4 text-sm text-brand-600">
            {message}
          </p>
        )}

        {/* Update Profile */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm mb-1">
              Name
            </label>

            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">
                Age
              </label>

              <input
                type="number"
                name="age"
                value={form.age}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">
                Gender
              </label>

              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">
                  Select Gender
                </option>

                <option value="male">
                  Male
                </option>

                <option value="female">
                  Female
                </option>

                <option value="other">
                  Other
                </option>

                <option value="prefer_not_to_say">
                  Prefer not to say
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">
              Blood Group
            </label>

            <input
              name="bloodGroup"
              value={form.bloodGroup}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">
              Phone Number
            </label>

            <input
              name="phoneNumber"
              value={form.phoneNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">
              Medical Conditions
            </label>

            <textarea
              name="medicalConditions"
              value={form.medicalConditions}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <button
            className="w-full py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700"
          >
            Save Changes
          </button>
        </form>

        <hr className="my-8" />

        {/* Identity Verification */}
        <h2 className="text-xl font-bold mb-4">
          Identity Verification
        </h2>

        <form
          onSubmit={handleDocumentUpload}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm mb-1">
              Document Type
            </label>

            <select
              value={documentType}
              onChange={(e) =>
                setDocumentType(e.target.value)
              }
              className="w-full px-3 py-2 rounded-md border dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="aadhaar">
                Aadhaar
              </option>

              <option value="passport">
                Passport
              </option>

              <option value="driving_license">
                Driving License
              </option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">
              Upload Document
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setDocument(e.target.files[0])
              }
            />
          </div>

          <button
            className="w-full py-2 rounded-md bg-green-600 text-white hover:bg-green-700"
          >
            Upload Verification Document
          </button>
        </form>
      </div>
    </div>
  );
}