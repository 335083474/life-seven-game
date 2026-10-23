// Public API address only. Provider credentials are held by the Worker.
window.LifeDM = (() => {
  const base = 'https://life-seven-game-api.test-garden.workers.dev';
  let session;
  try { session = localStorage.getItem('life-seven-session-v2'); } catch {}
  if (!/^[a-f0-9-]{36}$/i.test(session || '')) session = crypto.randomUUID();
  try { localStorage.setItem('life-seven-session-v2',session); } catch {}
  const errors = {
    ai_not_configured: '命运司书尚未就绪，请稍后再试。',
    ai_unavailable: '司书暂时未能回应，请重试。',
    ai_invalid_response: '这次回应未通过检查，请重试。',
    ai_busy: '司书正在处理较多来信，请稍后重试。',
    rate_limited: '请稍作停留，再继续书写。',
    daily_limit: '今日的司书服务已达上限，请明天再来。',
    request_in_progress: '这次请求仍在处理中，请稍后重试。',
    assessment_not_found: '这份评估已过期，请重新开始这一章。',
    invalid_request: '请检查事件文字与投入的卡牌。',
    life_not_found: '这份人生存档不存在或已经到期。',
    revision_conflict: '另一页已经更新了这局人生，已为你重新读取进度。',
    no_legal_risk: '这项行动没有合理的失牌风险，请把目标写得更具体后重新评估。',
    npc_declined: '同行者没有同意这次提议，请调整计划或换一位伙伴。',
    npc_action_used: '这位同行者本回合已经正式行动。',
    marriage_sacrifice_required: '没有爱情卡时，请选择一张普通元素转换为家庭。',
    protection_unavailable: '这次事件不符合保护条件，或保护次数已经用完。',
    pending_choice: '请先完成眼前的失牌保护或卡牌取舍。',
    wrong_phase: '当前人生已进入下一步，请刷新进度后继续。',
    recipient_full: '对方已经有七种元素，可以改为交换。',
    bound_card: '父母、家庭与孩子属于关系卡，不能直接转赠。',
    transfer_unavailable: '请在评估行动之前、且没有待处理取舍时交换资源。',
    relationship_solo_action: '关系行动由你单独发起，请先取消合作邀请。',
    marriage_unavailable: '当前已有婚姻关系，请先处理这段关系。',
    birth_unavailable: '当前不能再次生育，请确认已有婚姻且本局还没有孩子。',
    not_married: '当前尚无婚姻关系，不能发起离婚。',
    required_award: '请为已经确认的家庭选择腾出卡位。',
    choose_relationship_action: '这是一项关系行动，请先在“这次行动”中选择求婚、离婚或迎接孩子。'
  };
  return {
    newLife() { /* One durable browser identity can resume its own lives. */ },
    async call(route, body) {
      let response;
      try {
        response = await fetch(base + '/api/' + route, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session },
          body: JSON.stringify(body), signal: AbortSignal.timeout(65000), credentials: 'omit'
        });
      } catch { throw Object.assign(Error('暂时联系不上命运司书，请检查网络后重试。'), { code: 'network_error' }); }
      let data;
      try { data = await response.json(); } catch { throw Error('司书的回应未能读取，请重试。'); }
      if (!response.ok) throw Object.assign(Error(errors[data.error] || '这次请求未能完成，请稍后重试。'), { code: data.error, diceLocked: data.diceLocked });
      return data;
    }
  };
})();
