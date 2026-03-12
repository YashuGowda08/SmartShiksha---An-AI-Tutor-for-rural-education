const { MongoClient, ObjectId } = require("mongodb");

const uri = "mongodb+srv://yasha1b2c:8880Mgyash@cluster0.z1p6i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db("smart_shiksha");
    const test = await db.collection("mock_tests").findOne({});
    console.log("Sample Test ID:", test._id.toString());
    
    // Check questions by string and by ObjectId
    const questionsString = await db.collection("test_questions").find({ test_id: test._id.toString() }).toArray();
    console.log("Questions found (string ID):", questionsString.length);
    
    // Check what the first question looks like
    const firstQ = await db.collection("test_questions").findOne();
    console.log("Sample question test_id field type:", typeof firstQ?.test_id);
    console.log("Sample question test_id value:", firstQ?.test_id);

  } finally {
    await client.close();
  }
}
run().catch(console.dir);
