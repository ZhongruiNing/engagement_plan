export function validateGuestName(value) {
  const name = value.trim();
  if (!name) throw new Error('请输入宾客姓名');
  if ([...name].length > 80) throw new Error('宾客姓名请控制在80字以内');
  return name;
}
