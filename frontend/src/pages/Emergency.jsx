import { useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import FirstAidGuide from "../components/FirstAidGuide.jsx";

const Emergency = () => {
  const { user } = useAuth();

  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [nearbyPolice, setNearbyPolice] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);

  // Fetch nearby emergency resources
  const loadNearbyEmergencyResources = async (lat, lng) => {
    setLoadingResources(true);

    const results = await Promise.allSettled([
      api.get("/maps/nearby", {
        params: {
          lat,
          lng,
          type: "healthcare.hospital",
        },
      }),

      api.get("/maps/nearby", {
        params: {
          lat,
          lng,
          type: "service.police",
        },
      }),
    ]);

    const [hospitalResult, policeResult] = results;

    // Hospital result
    if (hospitalResult.status === "fulfilled") {
      setNearbyHospitals(
        hospitalResult.value.data.places || []
      );
    } else {
      console.error(
        "Hospital search failed:",
        hospitalResult.reason
      );

      setNearbyHospitals([]);
    }

    // Police result
    if (policeResult.status === "fulfilled") {
      setNearbyPolice(
        policeResult.value.data.places || []
      );
    } else {
      console.error(
        "Police search failed:",
        policeResult.reason
      );

      setNearbyPolice([]);
    }

    setLoadingResources(false);
  };

  // SOS handler
  const handleSOS = () => {
    setError("");
    setLoading(true);

    if (!navigator.geolocation) {
      setError(
        "Geolocation is not supported by your browser."
      );
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        setLocation({
          latitude,
          longitude,
        });

        await loadNearbyEmergencyResources(
          latitude,
          longitude
        );

        setLoading(false);
      },

      (error) => {
        setLoading(false);

        if (
          error.code ===
          error.PERMISSION_DENIED
        ) {
          setError(
            "Location permission was denied."
          );
        } else if (
          error.code ===
          error.POSITION_UNAVAILABLE
        ) {
          setError(
            "Unable to determine your location."
          );
        } else if (
          error.code === error.TIMEOUT
        ) {
          setError(
            "Location request timed out."
          );
        } else {
          setError(
            "Unable to get your location."
          );
        }
      }
    );
  };

  /*
   * Emergency contact
   *
   * Supports either:
   * emergencyContact: "9876543210"
   *
   * OR:
   * emergencyContact: {
   *   name: "...",
   *   phoneNumber: "9876543210"
   * }
   */

  const emergencyContact =
    user?.emergencyContact;

  const contactName =
    typeof emergencyContact === "object"
      ? emergencyContact?.name
      : "Emergency Contact";

  const contactNumber =
    typeof emergencyContact === "object"
      ? emergencyContact?.phoneNumber ||
        emergencyContact?.phone
      : emergencyContact;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-6 py-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
            Emergency Assistance
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-300">
            Get quick access to nearby emergency
            services and safety resources.
          </p>
        </div>

        {/* SOS Section */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8 text-center">

          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Emergency SOS
          </h2>

          <p className="text-lg text-gray-600 dark:text-gray-300 mb-7">
            Use SOS to find nearby emergency
            services using your current location.
          </p>

          <button
            onClick={handleSOS}
            disabled={loading}
            className="w-32 h-32 mx-auto rounded-full bg-red-600 text-white text-2xl font-bold shadow-xl hover:bg-red-700 hover:scale-105 transition-all duration-200 disabled:opacity-50"
          >
            {loading ? "Locating..." : "SOS"}
          </button>

          {/* Error */}
          {error && (
            <p className="mt-6 text-red-600 dark:text-red-400 text-lg font-medium">
              {error}
            </p>
          )}

          {/* Location */}
          {location && (
            <div className="mt-7 bg-green-50 dark:bg-green-900/20 rounded-xl p-5">
              <h3 className="text-xl font-semibold text-green-700 dark:text-green-400 mb-2">
                📍 Location Detected
              </h3>

              <p className="text-gray-700 dark:text-gray-300">
                Latitude: {location.latitude}
              </p>

              <p className="text-gray-700 dark:text-gray-300">
                Longitude: {location.longitude}
              </p>
            </div>
          )}
        </section>

        {/* Nearby Emergency Resources */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">

          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Nearby Emergency Resources
          </h2>

          {!location && (
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Click SOS to find emergency services
              near your current location.
            </p>
          )}

          {loadingResources && (
            <p className="text-lg text-gray-500">
              ⏳ Finding nearby emergency services...
            </p>
          )}

          {location && !loadingResources && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Hospitals */}
              <div className="border border-red-200 dark:border-red-900 rounded-xl p-6">

                <h3 className="text-2xl font-bold text-red-600 mb-4">
                  🏥 Hospitals
                </h3>

                {nearbyHospitals.length === 0 ? (
                  <p className="text-gray-500">
                    No nearby hospitals found.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {nearbyHospitals
                      .slice(0, 5)
                      .map((place) => (
                        <div
                          key={place.id}
                          className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {place.name ||
                              "Unnamed Hospital"}
                          </h4>

                          {place.lat &&
                            place.lon && (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-3 text-blue-600 hover:underline"
                              >
                                📍 Get Directions
                              </a>
                            )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Police */}
              <div className="border border-blue-200 dark:border-blue-900 rounded-xl p-6">

                <h3 className="text-2xl font-bold text-blue-600 mb-4">
                  🚓 Police Stations
                </h3>

                {nearbyPolice.length === 0 ? (
                  <p className="text-gray-500">
                    No nearby police stations found.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {nearbyPolice
                      .slice(0, 5)
                      .map((place) => (
                        <div
                          key={place.id}
                          className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                        >
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {place.name ||
                              "Unnamed Police Station"}
                          </h4>

                          {place.lat &&
                            place.lon && (
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block mt-3 text-blue-600 hover:underline"
                              >
                                📍 Get Directions
                              </a>
                            )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Emergency Contact */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">

          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            📞 Emergency Contact
          </h2>

          <p className="text-lg text-gray-600 dark:text-gray-300 mb-5">
            Quickly contact the emergency person
            saved in your TripMate profile.
          </p>

          {contactNumber ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 p-5 rounded-xl bg-gray-50 dark:bg-gray-700">

              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {contactName ||
                    "Emergency Contact"}
                </h3>

                <p className="text-lg text-gray-600 dark:text-gray-300 mt-1">
                  {contactNumber}
                </p>
              </div>

              <a
                href={`tel:${contactNumber}`}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-green-600 text-white text-lg font-semibold hover:bg-green-700 transition"
              >
                📞 Call Contact
              </a>

            </div>
          ) : (
            <div className="p-5 rounded-xl bg-yellow-50 dark:bg-yellow-900/20">

              <p className="text-lg text-yellow-700 dark:text-yellow-300">
                No emergency contact has been
                added to your profile yet.
              </p>

              <a
                href="/profile"
                className="inline-block mt-3 text-brand-600 font-semibold hover:underline"
              >
                Add Emergency Contact →
              </a>

            </div>
          )}
        </section>

        {/* First Aid Guide */}
        <FirstAidGuide />

      </div>
    </div>
  );
};

export default Emergency;