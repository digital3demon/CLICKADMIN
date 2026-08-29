/** js-openctm (Juan Mellado). Stream API is charCodeAt over a binary string. */
export const CTM: {
  Stream: new (data: string) => unknown;
  File: new (stream: unknown) => {
    body: {
      vertices: Float32Array;
      indices: Uint32Array;
      normals?: Float32Array | null;
    };
  };
};
