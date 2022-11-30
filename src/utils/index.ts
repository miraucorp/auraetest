export const max = (a: number, b: number): number => (Number(a) > Number(b) ? a : b);
export const min = (a: number, b: number): number => (Number(a) < Number(b) ? a : b);

export const uuidValidation = "regex:/^[a-zA-Z0-9-]{36}$/";
export const requiredUuidValidation = "required|regex:/^[a-zA-Z0-9-]{36}$/";

export const newErrWithCode = (message: string, status = 500): Error => {
  return Object.assign(new Error(message), { status, title: message });
};
