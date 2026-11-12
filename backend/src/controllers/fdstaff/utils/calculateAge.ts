export function calculateAge(
  dateOfBirth: string | Date,
): number | "Invalid Age" {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  const hasHadBirthday =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  if (!hasHadBirthday) {
    age--;
  }

  if (age < 0) {
    return "Invalid Age";
  }

  return age;
}
