// utils/serializer.js
export function serializeBigInt(obj) {
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  } else if (obj !== null && typeof obj === "object") {
    const serialized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "bigint") {
        serialized[key] = value.toString();
      } else if (Array.isArray(value) || (value && typeof value === "object")) {
        serialized[key] = serializeBigInt(value);
      } else {
        serialized[key] = value;
      }
    }
    return serialized;
  }
  return obj;
}
