/** Dimensions of bound PNGs and the one supported lossless VP8L WebP encoding. */
export function imageDimensions(bytes,extension){
 if(extension==='.png'){
  if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.toString('ascii',12,16)!=='IHDR')throw Error('Invalid PNG binding');
  const size=[bytes.readUInt32BE(16),bytes.readUInt32BE(20)];if(size.some(n=>n<1))throw Error('Invalid PNG dimensions');return size;
 }
 if(extension==='.webp'){
  if(bytes.length<25||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP'||bytes.readUInt32LE(4)+8!==bytes.length)throw Error('Invalid WebP binding');
  const length=bytes.readUInt32LE(16);
  if(bytes.toString('ascii',12,16)!=='VP8L'||bytes[20]!==0x2f||length<5||20+length+(length%2)!==bytes.length)throw Error('Expected one lossless VP8L chunk');
  const bits=bytes.readUInt32LE(21);if(bits>>>29)throw Error('Unsupported WebP lossless version');return [(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];
 }
 throw Error('Unsupported bound image extension: '+extension);
}
