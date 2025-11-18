const { getFirestore } = require("firebase-admin/firestore");

/**
 * @purpose Service for land parcel database operations.
 * Handles CRUD operations for the landParcels collection.
 * Follows single responsibility principle - only handles database operations.
 */

/**
 * @purpose Create a new land parcel document in Firestore.
 * @param {FirebaseFirestore.Firestore} db - Firestore instance (injected dependency)
 * @param {Object} parcelData - Land parcel data object
 * @returns {Promise<string>} Document ID of created parcel
 */
const createLandParcel = async (db, parcelData) => {
  console.log("[createLandParcel] Creating new land parcel", {
    parcelId: parcelData.parcelId,
    county: parcelData.address?.county,
  });

  try {
    const now = new Date();
    const documentData = {
      ...parcelData,
      createdAt: now,
      updatedAt: now,
      scrapedAt: now,
    };

    const docRef = await db.collection("landParcels").add(documentData);

    console.log("[createLandParcel] Land parcel created successfully", {
      documentId: docRef.id,
    });

    return docRef.id;
  } catch (error) {
    console.error("[createLandParcel] Error creating land parcel:", error);
    throw error;
  }
};

/**
 * @purpose Update an existing land parcel document.
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @param {string} parcelId - Document ID of parcel to update
 * @param {Object} updates - Partial update object
 * @returns {Promise<void>}
 */
const updateLandParcel = async (db, parcelId, updates) => {
  console.log("[updateLandParcel] Updating land parcel", { parcelId });

  try {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };

    await db.collection("landParcels").doc(parcelId).update(updateData);

    console.log("[updateLandParcel] Land parcel updated successfully", {
      parcelId,
    });
  } catch (error) {
    console.error("[updateLandParcel] Error updating land parcel:", error);
    throw error;
  }
};

/**
 * @purpose Get a land parcel by document ID.
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @param {string} parcelId - Document ID
 * @returns {Promise<Object|null>} Parcel data or null if not found
 */
const getLandParcelById = async (db, parcelId) => {
  console.log("[getLandParcelById] Fetching land parcel", { parcelId });

  try {
    const doc = await db.collection("landParcels").doc(parcelId).get();

    if (!doc.exists) {
      console.log("[getLandParcelById] Parcel not found", { parcelId });
      return null;
    }

    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error("[getLandParcelById] Error fetching land parcel:", error);
    throw error;
  }
};

/**
 * @purpose Query land parcels with filters.
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @param {Object} filters - Query filters
 * @param {Object} options - Query options (limit, orderBy, etc.)
 * @returns {Promise<Array>} Array of parcel documents
 */
const queryLandParcels = async (db, filters = {}, options = {}) => {
  console.log("[queryLandParcels] Querying land parcels", { filters });

  try {
    let query = db.collection("landParcels");

    // Apply filters
    if (filters.county) {
      query = query.where("address.county", "==", filters.county);
    }
    if (filters.status) {
      query = query.where("status", "==", filters.status);
    }
    if (filters.minPrice !== undefined) {
      query = query.where("price", ">=", filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      query = query.where("price", "<=", filters.maxPrice);
    }
    if (filters.zoning) {
      query = query.where("zoning", "==", filters.zoning);
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.orderBy(
        options.orderBy.field,
        options.orderBy.direction || "asc"
      );
    } else {
      query = query.orderBy("listingDate", "desc");
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    const parcels = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("[queryLandParcels] Query completed", {
      count: parcels.length,
    });

    return parcels;
  } catch (error) {
    console.error("[queryLandParcels] Error querying land parcels:", error);
    throw error;
  }
};

/**
 * @purpose Find land parcel by source parcel ID (for deduplication).
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @param {string} sourceParcelId - Source system parcel ID
 * @param {string} source - Source system name
 * @returns {Promise<Object|null>} Existing parcel or null
 */
const findLandParcelBySourceId = async (db, sourceParcelId, source) => {
  console.log("[findLandParcelBySourceId] Finding parcel by source ID", {
    sourceParcelId,
    source,
  });

  try {
    const snapshot = await db
      .collection("landParcels")
      .where("parcelId", "==", sourceParcelId)
      .where("source", "==", source)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error(
      "[findLandParcelBySourceId] Error finding parcel by source ID:",
      error
    );
    throw error;
  }
};

module.exports = {
  createLandParcel,
  findLandParcelBySourceId,
  getLandParcelById,
  queryLandParcels,
  updateLandParcel,
};

