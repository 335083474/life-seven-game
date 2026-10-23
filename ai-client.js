// Public API address only. Provider credentials are held by the Worker.
window.LifeDM = (() => {
  const base = 'https://life-seven-game-api.test-garden.workers.dev';
  let session = crypto.randomUUID();
  const errors = {
    ai_not_configured: '命运司书尚未就绪，请稍后再试。',
    ai_unavailable: '司书暂时未能回应，请重试。',
    ai_invalid_response: '这次回应未通过检查，请重试。',
    ai_busy: '司书正在处理较多来信，请稍后重试。',
    rate_limited: '请稍作停留，再继续书写。',
    daily_limit: '今日的司书服务已达上限，请明天再来。',
    request_in_progress: '这次请求仍在处理中，请稍后重试。',
    assessment_not_found: '这份评估已过期，请重新开始这一章。',
    invalid_request: '请检查事件文字与投入的卡牌。'
  };
  return {
    newLife() { session = crypto.randomUUID(); },
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
