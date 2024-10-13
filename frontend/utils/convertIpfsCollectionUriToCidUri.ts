export function convertIpfsCollectionUriToCidUri(ipfsUri: string) {
  return ipfsUri.replace("/collection.json", "");
}
