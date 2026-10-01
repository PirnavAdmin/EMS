export const cv = (o,...keys) => keys.map(k=>o?.[k]).find(v=>v!==undefined&&v!==null&&v!=="");
export const unwrap = d => d?.data ?? d?.result ?? d;
export const rows = d => { const v=unwrap(d); return Array.isArray(v)?v:(v?.items||v?.records||v?.data||[]); };
export const clearanceComplete = clearance => {
  if (!clearance) return false;
  const approved = ["approved", "completed", "cleared", "good"];
  const status = field => String(cv(clearance, field, field[0].toUpperCase() + field.slice(1), field.replace("Status", "_Status")) ?? "").trim().toLowerCase();
  return ["hrStatus", "itStatus", "financeStatus", "adminStatus"].every(field => approved.includes(status(field)));
};
export const clearanceError = e => { const s=e?.response?.status,b=e?.response?.data; const validation=b?.errors&&typeof b.errors==="object"?Object.entries(b.errors).flatMap(([key,messages])=>(Array.isArray(messages)?messages:[messages]).map(message=>`${key}: ${message}`)).join(" "):""; return validation||b?.message||b?.detail||b?.title||(typeof b==="string"?b:"")||(s===403?"You do not have clearance permission.":s===404?"Clearance was not found.":s===409?"Clearance already exists or is already completed.":s>=500?"The server could not process clearance.":e?.request?"Network error. Check your connection.":"Unable to load clearance data."); };
