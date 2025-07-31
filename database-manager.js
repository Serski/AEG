const admin = require('firebase-admin');

// Replace 'path/to/serviceAccountKey.json' with the path to the JSON file you downloaded
const serviceAccount = require('./firebaseKey.json');
const fs = require('fs');
const path = require('path');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

let data = {}

const storageDir = path.join(__dirname, 'jsonStorage');

// // Ensure the storage directory exists
// if (!fs.existsSync(storageDir)) {
//   fs.mkdirSync(storageDir);
// }

// Save Function - save(UserName, DataToBeSaved)
// async function saveCollection(collectionName, data) {
//   const filePath = path.join(storageDir, `${collectionName}.json`);
//   return new Promise((resolve, reject) => {
//     fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
//       if (err) {
//         console.error('Error saving collection:', err);
//         reject(err);
//       } else {
//         console.log('Collection saved successfully');
//         resolve();
//       }
//     });
//   });
// }

// // Load Function - creates a map of doc names to doc data
// async function loadCollection(collectionName) {
//   const filePath = path.join(storageDir, `${collectionName}.json`);
//   return new Promise((resolve, reject) => {
//     fs.readFile(filePath, 'utf8', (err, data) => {
//       if (err) {
//         if (err.code === 'ENOENT') {
//           console.log('No such collection!');
//           resolve({});
//         } else {
//           console.error('Error loading collection:', err);
//           reject(err);
//         }
//       } else {
//         resolve(JSON.parse(data));
//       }
//     });
//   });
// }

// async function saveFile(collectionName, docId, data) {
//   let collectionData;
//   try {
//     collectionData = await loadCollection(collectionName);
//   } catch (error) {
//     collectionData = {};
//   }
//   collectionData[docId] = data;
//   return saveCollection(collectionName, collectionData);
// }

// async function loadFile(collectionName, docId) {
//   try {
//     const collectionData = await loadCollection(collectionName);
//     if (collectionData.hasOwnProperty(docId)) {
//       return collectionData[docId];
//     } else {
//       console.log('No such document!');
//       return undefined;
//     }
//   } catch (error) {
//     console.error('Error loading document:', error);
//     return {};
//   }
// }

// async function docDelete(collectionName, docName) {
//   try {
//     const collectionData = await loadCollection(collectionName);
//     if (collectionData.hasOwnProperty(docName)) {
//       delete collectionData[docName];
//       await saveCollection(collectionName, collectionData);
//       console.log('Document deleted');
//     } else {
//       console.log('No such document to delete!');
//     }
//   } catch (error) {
//     console.error('Error deleting document:', error);
//     throw error;
//   }
// }

// async function fieldDelete(collectionName, docName, deleteField) {
//   try {
//     const collectionData = await loadCollection(collectionName);
//     if (collectionData.hasOwnProperty(docName) && collectionData[docName].hasOwnProperty(deleteField)) {
//       delete collectionData[docName][deleteField];
//       await saveCollection(collectionName, collectionData);
//       console.log('Field deleted');
//     } else {
//       console.log('No such document or field to delete!');
//     }
//   } catch (error) {
//     console.error('Error deleting field:', error);
//     throw error;
//   }
// }

// async function logData() {
//   try {
//     //Find all collections in the storage directory
//     const files = fs.readdirSync(storageDir);
//     const collections = files.map(file => file.split('.')[0]);
//     //Remove the logs collection from the list
//     const logsIndex = collections.indexOf('logs');
//     if (logsIndex > -1) {
//       collections.splice(logsIndex, 1);
//     }
//     let logData = {};
//     for (const collectionName of collections) {
//       const collectionData = await loadCollection(collectionName);
//       logData[collectionName] = collectionData;
//     }
//     const date = new Date();
//     const dateString = date.toISOString().split('T')[0];
//     await saveFile('logs', dateString, logData);
//     console.log(`Log data for ${dateString} saved successfully.`);
//   } catch (error) {
//     console.error('Error logging data:', error);
//   }
// }

// async function backupJsonToFirestore() {
//   console.log("Backing up JSON data to Firestore.");
//   try {
//     const files = fs.readdirSync(storageDir);
//     const date = new Date();
//     const timestamp = date.toISOString().replace(/[-:.]/g, '_');
//     const backupCollectionName = `backup_${timestamp}`;

//     const batch = db.batch();

//     //remove the logs collection from the list
//     const logsIndex = files.indexOf('logs.json');
//     if (logsIndex > -1) {
//       files.splice(logsIndex, 1);
//     }

//     for (const file of files) {
//       const collectionName = path.basename(file, '.json'); // Get the collection name without extension
//       const filePath = path.join(storageDir, file);
//       const collectionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

//       const docRef = db.collection(backupCollectionName).doc(collectionName);

//       batch.set(docRef, collectionData);
//     }

//     await batch.commit();
//     console.log(`All collections backed up successfully under ${backupCollectionName}.`);
//   } catch (error) {
//     console.error('Error backing up JSON data to Firestore:', error);
//   }
// }

// async function backupFirestoreToJson() {
//   try {
//     const collections = await db.listCollections();

//     //remove the logs collection from the list
//     const logsIndex = collections.indexOf('logs');
//     if (logsIndex > -1) {
//       collections.splice(logsIndex, 1);
//     }

//     for (const collection of collections) {
//       const snapshot = await collection.get();
//       let collectionData = {};
//       snapshot.forEach(doc => {
//         collectionData[doc.id] = doc.data();
//       });
//       await saveCollection(collection.id, collectionData);
//       console.log(`Collection ${collection.id} backed up successfully.`);
//     }
//   } catch (error) {
//     console.error('Error backing up Firestore data:', error);
//   }
// }

async function saveCollection(collectionName, data) {
  const batch = db.batch();

  Object.keys(data).forEach(docId => {
    const docRef = db.collection(collectionName).doc(docId);
    batch.set(docRef, data[docId]);
  });

  return batch.commit()
    .then(() => console.log('Collection saved successfully'))
    .catch(error => console.error('Error saving collection:', error));
}

// Load Function - creates a map of doc names to doc data
async function loadCollection(collectionName) {
  try {
    const collection = await db.collection(collectionName).get();
    const data = {};
    collection.forEach(doc => data[doc.id] = doc.data());
    return data;
  } catch (error) {
    console.error('Error loading collection:', error);
    return {};
  }
}

async function loadCollectionFileNames(collectionName) {
  try {
    const docRefs = await db.collection(collectionName).listDocuments();
    const data = {}
    for (const docRef of docRefs) {
      data[docRef.id] = docRef.id;
    }
    return data;
  }
  catch (error) {
    console.error('Error loading collection:', error);
    return {};
  }
}

async function saveFile(collectionName, docId, data) {
  return db.collection(collectionName).doc(docId).set(data)
    .then(() => console.log('Document saved successfully'))
    .catch(error => {
        console.error('Error saving document:', error);
        throw error; // Re-throw the error to ensure it can be caught by the calling function
    });
}

async function loadFile(collectionName, docId) {
  try {
    const doc = await db.collection(collectionName).doc(docId).get();
    if (doc.exists) {
      return doc.data();
    } else {
      console.log('No such document!');
      return undefined;
    }
  } catch (error) {
    console.error('Error loading document:', error);
    return {};
  }
}

async function docDelete(collectionName, docName) {
  return db.collection(collectionName).doc(docName).delete()
    .then(() => console.log('Document deleted'))
    .catch(error => {
        console.error('Error deleting document:', error);
        throw error; // Re-throw the error to ensure it can be caught by the calling function
    });
}

async function fieldDelete(collectionName, docName, deleteField) {
  return db.collection(collectionName).doc(docName).update({
    [deleteField]: admin.firestore.FieldValue.delete()
  })
    .then(() => console.log('Field deleted'))
    .catch(error => {
        console.error('Error deleting field:', error);
        throw error; // Re-throw the error to ensure it can be caught by the calling function
    });
}

async function logData() {
  try {
    const collections = await db.listCollections();
    let logData = {};
    for (const collection of collections) {
      if (collection.id === 'logs') {
        continue;
      }
      const snapshot = await collection.get();
      logData[collection.id] = {};
      snapshot.forEach(doc => {
        logData[collection.id][doc.id] = doc.data();
      });
    }
    const date = new Date();
    const dateString = date.toISOString().split('T')[0];

    await saveFile('logs', dateString, logData);
    console.log(`Log data for ${dateString} saved successfully in Firestore.`);
  } catch (error) {
    console.error('Error logging data:', error);
  }
}

async function moveJsonToFirestore() {
  try {
    const files = fs.readdirSync(storageDir);
    for (const file of files) {
      const collectionName = path.basename(file, '.json'); // Get the collection name without extension
      const filePath = path.join(storageDir, file);
      const collectionData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      await saveCollection(collectionName, collectionData);
      console.log(`Collection ${collectionName} moved successfully.`);
    }
  } catch (error) {
    console.error('Error moving JSON data to Firestore:', error);
  }

}


module.exports = { saveCollection, loadCollection, loadCollectionFileNames, saveFile, loadFile, docDelete, fieldDelete, logData };
