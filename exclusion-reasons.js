export const reasonOptions=[['','Без причины'],['PIT','Въезд в боксы'],['OUT','Выезд из боксов'],['VSC','Виртуальная машина безопасности'],['SC','Машина безопасности'],['W2W','Борьба колесо в колесо'],['OTHER','Другое']];
export function validateReasons(value,overrides){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Неверный формат причин');
 const allowed=new Set(reasonOptions.map(([code])=>code)),out={};
 for(const [key,code]of Object.entries(value)){
  if(overrides[key]!==false||typeof code!=='string'||!allowed.has(code))throw new Error('Неверная причина исключения');
  if(code)out[key]=code;
 }
 return out;
}
