// Cards describe resources and relationships, never the literal life of a person.
export const levelValue = card => Math.min(card?.level || 0, 2);
export const find = (person, name) => person.cards.find(card => card.name === name);
export const healthLeft = person => Math.max(0, levelValue(find(person, '健康')) - (find(person, '健康')?.spent || 0));
export function remove(person, name) {
  const card = find(person, name);
  if (card) person.cards.splice(person.cards.indexOf(card), 1);
  return card;
}
export function receive(person, name, {ensure = false} = {}) {
  const existing = find(person, name);
  if (existing) {
    if (!ensure) existing.level = Math.min(3, existing.level + 1);
    // An upgrade retains spent health charges. Reacquisition makes a new instance.
    return {kind: ensure ? 'retained' : 'upgraded', name, level: existing.level};
  }
  if (person.cards.length >= 7) return {kind: 'overflow', name};
  person.cards.push({name, level: 1, ...(name === '健康' ? {spent: 0} : {})});
  return {kind: 'gained', name, level: 1};
}
export function healthProtection(person, spouse, {joint = false} = {}) {
  const own = healthLeft(person), other = spouse ? healthLeft(spouse) : 0;
  if (joint && own && other) {
    find(person, '健康').spent = (find(person, '健康').spent || 0) + 1;
    find(spouse, '健康').spent = (find(spouse, '健康').spent || 0) + 1;
    return {protected: true, spent: 2, sharedLast: false};
  }
  if (joint && own + other >= 2) {
    const owner = own ? person : spouse;
    find(owner, '健康').spent = (find(owner, '健康').spent || 0) + 2;
    return {protected: true, spent: 2, sharedLast: false};
  }
  const owner = own ? person : other ? spouse : null;
  if (!owner) return {protected: false, spent: 0};
  find(owner, '健康').spent = (find(owner, '健康').spent || 0) + 1;
  return {protected: true, spent: 1, sharedLast: joint};
}
