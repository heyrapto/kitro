declare module "five-bells-condition" {
  export class PreimageSha256 {
    setPreimage(preimage: Uint8Array): void;
    getConditionBinary(): Buffer;
    serializeBinary(): Buffer;
  }

  export function fromFulfillmentBinary(data: Uint8Array): {
    getConditionBinary(): Buffer;
    serializeBinary(): Buffer;
  };

  const fiveBellsCondition: {
    PreimageSha256: typeof PreimageSha256;
    fromFulfillmentBinary: typeof fromFulfillmentBinary;
  };

  export default fiveBellsCondition;
}
