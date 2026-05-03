// Common Prisma select shapes that include the envelope-encryption metadata required for
// lib/prisma's extension to decrypt the values at runtime. Without these columns in a select,
// the User/Article/etc. row lacks the wrapped DEK and the extension can't synthesize plaintext.
//
// Use these instead of hand-writing `select: { id: true, name: true, ... }` for encrypted models.

export const userPublicSelect = {
  id: true,
  name: true,
  image: true,
  role: true,
  displayTitle: true,
  encryptedDek: true,
  dekKekVersion: true,
  nameCiphertext: true,
  imageCiphertext: true,
} as const;

export const userPublicWithEmailSelect = {
  ...userPublicSelect,
  email: true,
  emailCiphertext: true,
} as const;

export const userMinimalNameSelect = {
  id: true,
  name: true,
  encryptedDek: true,
  dekKekVersion: true,
  nameCiphertext: true,
} as const;

export const userMinimalNameImageSelect = {
  id: true,
  name: true,
  image: true,
  encryptedDek: true,
  dekKekVersion: true,
  nameCiphertext: true,
  imageCiphertext: true,
} as const;
