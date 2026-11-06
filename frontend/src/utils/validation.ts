const USERNAME_REGEX = /^[A-Za-z0-9_.\-]+$/;

export function validateUsername(value: string): string | null {
  if (!value.trim()) return "El usuario no puede estar vacío.";
  if (value.length < 3) return "El usuario debe tener al menos 3 caracteres.";
  if (value.length > 50) return "El usuario no puede superar los 50 caracteres.";
  if (/\s/.test(value)) return "El usuario no puede contener espacios.";
  if (!USERNAME_REGEX.test(value)) return "Solo se permiten letras, números, puntos, guiones y guión bajo.";
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "La contraseña no puede estar vacía.";
  if (value.length < 6) return "La contraseña debe tener al menos 6 caracteres.";
  if (value.length > 72) return "La contraseña no puede superar los 72 caracteres.";
  return null;
}
