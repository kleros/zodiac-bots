#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

if [ ! -x "$(command -v cast)" ]; then
  >&2 echo "error: cast is not installed, please install it from https://book.getfoundry.sh/getting-started/installation"
  exit 1
fi

if [ $# -lt 2 ] || [ $# -gt 3 ]; then
  echo "Usage: $(basename $0) <spaceId> <proposalId> [<expectedHash>]"
  echo "       $(basename $0) 1inch.eth 0xdbf016740668f8e646fa9c26e583ce7909b452444aef29728e353852f7982e71"
  echo "       $(basename $0) 1inch.eth 0xdbf016740668f8e646fa9c26e583ce7909b452444aef29728e353852f7982e71 0x95de4e30a67f13ab3343a172f4b7b96c72984ed47a54667b279f131fef1e4652"
  exit 1
fi

spaceId=$1
proposalId=$2
expectedHash=$3

# === Reality question details ===
# Did the Snapshot proposal with the id 0xdbf016740668f8e646fa9c26e583ce7909b452444aef29728e353852f7982e71 
# in the 1inch.eth space pass the execution of the array of Module transactions
# that have the hash 0x95de4e30a67f13ab3343a172f4b7b96c72984ed47a54667b279f131fef1e4652 
# and does it meet the requirements of the document referenced in the dao 
# requirements record at 1inch.eth? The hash is the keccak of the concatenation of 
# the individual EIP-712 hashes of the Module transactions. If this question was 
# asked before the corresponding Snapshot proposal was resolved, it should ALWAYS be resolved to INVALID!

echo "Proposal URL: https://snapshot.org/#/$spaceId/proposal/$proposalId"

ipfsCid=$(curl -s -H 'Content-Type: application/json' --data-raw $'{"operationName":"Proposal",
  "variables":{"id":"'$proposalId'"},
  "query":"query Proposal($id: String\u0021) {proposal(id: $id) { id ipfs title }}"}' \
  https://hub.snapshot.org/graphql \
  | jq -r .data.proposal.ipfs)

ipfsData=$(curl -s "https://snapshot.4everland.link/ipfs/$ipfsCid" \
  | jq -r .data.message.plugins \
  | jq .safeSnap.safes[0].txs)

echo "IPFS Data: $ipfsData"

realityModuleAddress=$(curl -s -H "Content-Type: application/json" \
  -d '{ "query": "{ space(id: \"'$spaceId'\") { plugins  } } " }' \
  https://hub.snapshot.org/graphql \
  | jq -r .data.space.plugins.safeSnap.address)

echo "Reality Module Address: $realityModuleAddress"

transactionHashes=""
while read -r transaction; do
  transactionHash=$(cast call -r https://eth.llamarpc.com $realityModuleAddress "getTransactionHash(address,uint256,bytes,uint8,uint256)" \
    $(echo $transaction | jq -r '.to') \
    $(echo $transaction | jq -r '.value') \
    $(echo $transaction | jq -r '.data') \
    $(echo $transaction | jq -r '.operation') \
    $(echo $transaction | jq -r '.nonce') )
  # transactionHash=$(cast abi-decode "foo()(bytes)" $transactionHash)
  transactionHashes+=$transactionHash
done < <(echo $ipfsData | jq -c '.[].transactions[]')
echo "Transaction Hashes: $transactionHashes"

transactionsFinalHash=$(cast keccak $transactionHashes)
echo "Final Hash: $transactionsFinalHash"

if [ "$expectedHash" ]; then
  if [ "$expectedHash" == "$transactionsFinalHash" ]; then
    echo "✅ Hashes match!"
  else
    echo "❌ Hashes do not match!"
  fi
fi
