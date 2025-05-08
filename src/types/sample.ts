export interface Sample {
  sampleId: string;
  style: string;
  buyer: string;
  typeOfSample: string;
  noOfPieces: number;
  patternNo: string;
  size: string;
  washType: string;
  typeOfFabric: string;
  color: string;
  imageUrl?: string;
  // Add any other properties that are used in the SamplingProgramSheet
}
