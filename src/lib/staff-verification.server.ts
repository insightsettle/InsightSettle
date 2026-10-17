export async function verifyMemberRecord(db: any, actor: string, userId: string, kind: 'business' | 'payout', simulated: boolean) {
  if (kind === 'payout' && !simulated) throw new Error('Live payout verification requires a provider check.');
  const { data: profile, error: profileError } = await db.from('profiles').select('verification_status,account_type').eq('id', userId).single();
  if (profileError) throw profileError;
  if (profile?.verification_status !== 'verified') throw new Error('Approve identity first.');
  if (kind === 'business' && profile.account_type !== 'business') throw new Error('A business account is required.');
  const table = kind === 'business' ? 'business_profiles' : 'payout_accounts';
  const field = kind === 'business' ? 'verification_status' : 'verified';
  const { data: old, error: readError } = await db.from(table).select('*').eq('user_id', userId).single();
  if (readError || !old) throw new Error('The member must submit these details first.');
  const value = kind === 'business' ? 'verified' : true;
  const { error } = await db.from(table).update({ [field]: value }).eq('user_id', userId);
  if (error) throw error;
  const { error: auditError } = await db.from('audit_logs').insert({ user_id: actor, action: kind === 'business' ? 'verify_business_profile' : 'verify_payout_account_demo', entity: table, entity_id: userId, old_value: { [field]: old[field] }, new_value: { [field]: value, ...(kind === 'payout' ? { provider_check: 'simulated' } : {}) }, created_at: new Date().toISOString() });
  if (auditError) throw auditError;
  return { ok: true };
}