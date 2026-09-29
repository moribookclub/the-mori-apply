// THE MORI APPLY 서버 기능
// 앱이 notifications/{email}/items 에 알림을 저장하면, 그 사람의 휴대폰(등록된 모든 기기)으로 푸시를 보낸다.
// 알림 설정(전체·상황별 끄기)은 앱이 알림을 저장하기 전에 이미 확인하므로 여기서는 저장된 알림을 그대로 보낸다.
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

admin.initializeApp();

const APP_URL = 'https://moribookclub.github.io/the-mori-apply/';

// 기기 주소(토큰)가 더 이상 쓸 수 없다는 뜻의 오류들 → 저장된 목록에서 지움
const DEAD_TOKEN_ERRORS = [
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
];

exports.sendPushOnNotification = functions
  .region('asia-northeast3') // 서울
  .firestore.document('notifications/{email}/items/{itemId}')
  .onCreate(async (snap, context) => {
    const email = context.params.email;
    const message = (snap.data() || {}).message;
    if (!message) return;

    const userRef = admin.firestore().collection('users').doc(email);
    const user = (await userRef.get()).data();
    if (!user) return;

    // 여러 기기(fcmTokens) + 예전 방식으로 저장된 한 기기(fcmToken)
    const tokens = [...new Set([...(user.fcmTokens || []), user.fcmToken].filter(Boolean))];
    if (!tokens.length) return;

    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      webpush: {
        notification: {
          title: 'THE MORI',
          body: message,
          icon: APP_URL + 'icon-192.png',
          badge: APP_URL + 'icon-192.png',
          tag: context.params.itemId,
        },
        fcmOptions: { link: APP_URL },
      },
    });

    const dead = tokens.filter((t, i) => {
      const r = res.responses[i];
      return !r.success && DEAD_TOKEN_ERRORS.includes(r.error?.code);
    });
    if (dead.length) {
      const update = { fcmTokens: admin.firestore.FieldValue.arrayRemove(...dead) };
      if (dead.includes(user.fcmToken)) update.fcmToken = admin.firestore.FieldValue.delete();
      await userRef.update(update);
    }
    functions.logger.info(`푸시 발송 ${email}: 성공 ${res.successCount}, 실패 ${res.failureCount}, 정리 ${dead.length}`);
  });
