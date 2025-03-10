export const formatPhoneNumber = (number) => {
  if (number.startsWith("54911")) return number.replace("54911", "+541115");
  return number;
}