// GET /api/maps/nearby?lat=..&lng=..&type=..

const getNearbyPlaces = async (req, res) => {
  try {
    const { lat, lng, type } = req.query;

    if (!lat || !lng || !type) {
      return res.status(400).json({
        message: "Latitude, Longitude and Type are required.",
      });
    }

    const userLat = Number(lat);
    const userLng = Number(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({
        message: "Latitude and Longitude must be valid numbers.",
      });
    }

    const apiKey = process.env.GEOAPIFY_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        message: "Geoapify API key is not configured.",
      });
    }

    // 25 km search radius
    const radius = 25000;

    // Ask Geoapify for up to 50 places
    const limit = 50;

    const url =
      `https://api.geoapify.com/v2/places` +
      `?categories=${encodeURIComponent(type)}` +
      `&filter=circle:${userLng},${userLat},${radius}` +
      `&limit=${limit}` +
      `&apiKey=${apiKey}`;

    console.log("Nearby places request:", {
      lat: userLat,
      lng: userLng,
      type,
      radius: `${radius / 1000} km`,
      limit,
    });

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();

      console.log("Geoapify Status:", response.status);
      console.log("Geoapify Response:", errorText);

      return res.status(response.status).json({
        message: "Geoapify request failed",
        error: errorText,
      });
    }

    const data = await response.json();

    /*
     * Calculate distance between user and place
     * using the Haversine formula.
     */
    const calculateDistance = (
      lat1,
      lon1,
      lat2,
      lon2
    ) => {
      const earthRadius = 6371; // km

      const dLat =
        ((lat2 - lat1) * Math.PI) / 180;

      const dLon =
        ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;

      const c =
        2 * Math.atan2(
          Math.sqrt(a),
          Math.sqrt(1 - a)
        );

      return earthRadius * c;
    };

    const places = (data.features || [])
      .map((item) => {
        const placeLat = Number(item.properties.lat);
        const placeLon = Number(item.properties.lon);

        if (
          isNaN(placeLat) ||
          isNaN(placeLon)
        ) {
          return null;
        }

        const distance = calculateDistance(
          userLat,
          userLng,
          placeLat,
          placeLon
        );

        return {
          id: item.properties.place_id,
          lat: placeLat,
          lon: placeLon,
          name:
            item.properties.name ||
            item.properties.address_line1 ||
            "Unnamed Place",
          distance: Number(distance.toFixed(2)),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);

    res.json({
      places,
      count: places.length,
    });

  } catch (err) {
    console.error("Nearby places error:", err);

    res.status(500).json({
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

module.exports = {
  getNearbyPlaces,
};