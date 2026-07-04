import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="terms-page">
      <section className="terms-card">
        <Link className="terms-back" href="/">GOjeje</Link>
        <h1>Terms & Conditions</h1>
        <p className="terms-version">GOjeje v1.1</p>

        <div className="terms-grid">
          <article>
            <h2>தமிழ்</h2>
            <p>
              GOjeje பல்வேறு செய்தி தளங்களிலிருந்து தலைப்புகள், படங்கள், நேரம், மூல இணைப்புகள் போன்ற தகவல்களை காட்டுகிறது.
              அந்த செய்திகளின் உரிமை அசல் வெளியீட்டாளர்களுக்கே சொந்தமானது.
            </p>
            <p>
              GOjeje AI சுருக்கங்கள் வாசிக்க எளிதாக உதவுவதற்காக மட்டுமே. சுருக்கங்கள் முழுமையானதாக அல்லது பிழையில்லாததாக இருக்கலாம் என்று உறுதி செய்ய முடியாது.
            </p>
            <p>
              முழு செய்தி, புதுப்பிப்பு, சட்ட/நிதி/மருத்துவம் போன்ற முக்கிய முடிவுகளுக்கு அசல் செய்தி மூல இணைப்பை திறந்து சரிபார்க்கவும்.
            </p>
          </article>

          <article>
            <h2>English</h2>
            <p>
              GOjeje displays headlines, images, times, source names, and links from third-party news publishers.
              The original publishers own their content.
            </p>
            <p>
              GOjeje AI summaries are provided only to make news easier to read. Summaries may be incomplete or imperfect.
            </p>
            <p>
              For the full story, latest updates, or important legal, financial, medical, or safety decisions, open and verify the original source link.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
