declare module "five-bells-condition" {
  export class PreimageSha256 {
    setPreimage(preimage: Uint8Array): void;
    getConditionBinary(): Buffer;
    serializeBinary(): Buffer;
  }

  const fiveBellsCondition: {
    PreimageSha256: typeof PreimageSha256;
  };

  export default fiveBellsCondition;
}
