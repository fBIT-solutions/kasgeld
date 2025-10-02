import { CosmosClient } from "@azure/cosmos";


const databaseId = process.env.COSMOSDB_DATABASE;
const connectionString = process.env.COSMOSDB_CONNECTION_STRING;

const client = new CosmosClient(connectionString);
const userId = "c6cf2053-b3f6-4455-aa25-d7d8e98d19e3"; // Replace with actual user ID

export async function getContainer(containerId) {
  const database = client.database(databaseId);
  return database.container(containerId);
}

export async function addItem(containerId, data) {
  const container = await getContainer(containerId);
  const item = { ...data, userId: userId, id: crypto.randomUUID() };

  const { resource } = await container.items.create(item);
  return resource;
}

export async function getItems(containerId) {
    const container = await getContainer(containerId);
    const querySpec = {
      query: "SELECT * FROM c WHERE c.userId = @userId",
      parameters: [{ name: "@userId", value: userId }]
    };
  
    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources
}