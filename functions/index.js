const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');

admin.initializeApp();
const db = admin.firestore();

sgMail.setApiKey('YOUR_SENDGRID_API_KEY');
const FROM_EMAIL = 'your-verified-sender@example.com';

const twilioClient = new twilio('YOUR_TWILIO_SID', 'YOUR_TWILIO_AUTH_TOKEN');
const TWILIO_FROM_NUMBER = '+1234567890';

const insights = [
  {text: "Hospital admissions for bipolar depression increased after geomagnetic storms.", link: "https://www.cambridge.org/core/journals/the-british-journal-of-psychiatry/article/geomagnetic-storms-association-with-incidence-of-depression-as-measured-by-hospital-admission/78F4CE06FB5B69FC16E5417A05787210"},
  {text: "EEG studies show geomagnetic disturbances influence brainwave activity.", link: "https://www.redalyc.org/pdf/1812/181220525080.pdf"},
  {text: "Geomagnetic storms correlate with heart rate variability.", link: "https://pubmed.ncbi.nlm.nih.gov/19102888/"},
  {text: "Sunspot cycles linked with societal unrest.", link: "https://doi.org/10.1016/j.techfore.2007.08.004"},
  {text: "Space weather may modulate melatonin and affect sleep.", link: "https://www.sciencedirect.com/science/article/abs/pii/S0149763417302937"}
];

exports.dailySpaceWeatherCheck = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  try {
    const response = await fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json');
    const data = await response.json();
    const latest = data[data.length - 1];

    if (latest.kp_index >= 5) {
      const randomInsight = insights[Math.floor(Math.random() * insights.length)];
      const snapshot = await db.collection('earlyBuzzUsers').get();
      const users = snapshot.docs.map(doc => doc.data());

      const sends = users.map(user => sgMail.send({
        to: user.email,
        from: FROM_EMAIL,
        subject: "🌬️ The Earth's Breath is Stirring...",
        html: `<p>Dear Soul Attuned to the Earth,</p><p>A geomagnetic storm is brewing. 🌿 Reflect gently.</p><p><strong>Insight:</strong> ${randomInsight.text}<br/><a href="${randomInsight.link}" target="_blank">Read the study →</a></p><p>Stay grounded.</p>`
      }));

      const smsSends = users.filter(u => u.phone).map(user => twilioClient.messages.create({
        body: "🌬️ Early Buzz: A geomagnetic storm is stirring. Breathe deep. 🌿",
        from: TWILIO_FROM_NUMBER,
        to: user.phone
      }));

      await Promise.all([...sends, ...smsSends]);
    }
  } catch (error) {
    console.error('Early Buzz check error:', error);
  }
  return null;
});
