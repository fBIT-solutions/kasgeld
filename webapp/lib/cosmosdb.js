import { CosmosClient } from "@azure/cosmos";


const databaseId = process.env.COSMOSDB_DATABASE;
const connectionString = process.env.COSMOSDB_CONNECTION_STRING;

const client = new CosmosClient(connectionString);

export async function getContainer(containerId) {
  const database = client.database(databaseId);
  return database.container(containerId);
}

export async function getDatabase() {
  return client.database(databaseId);
}

export async function addItem(containerId, data, communityId) {
  const container = await getContainer(containerId);
  const item = {
    ...data,
    ...(communityId ? { communityId } : {}),
    id: data.id || crypto.randomUUID(),
  };

  const { resource } = await container.items.create(item);
  return resource;
}

export async function getItems(containerId, communityId) {
    if (!communityId) {
      throw new Error("communityId is required to read community data");
    }
    const container = await getContainer(containerId);
    const querySpec = {
      query: "SELECT * FROM c WHERE c.communityId = @communityId",
      parameters: [{ name: "@communityId", value: communityId }]
    };
  
    const { resources } = await container.items.query(querySpec).fetchAll();
    return resources
}