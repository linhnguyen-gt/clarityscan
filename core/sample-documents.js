export const SAMPLE_DOCUMENTS = [
  {
    id: "apartment-lease",
    docType: "lease",
    title: "Apartment Lease",
    text: [
      "Residential lease agreement for Unit 4B at Alder Court.",
      "The tenant will pay $1,425.00 in monthly rent on the first business day of each month.",
      "The lease automatically renews for another 12 months unless the tenant gives notice 60 days before the end of the term.",
      "The $850 security deposit is non-refundable, even if the unit is returned in good condition.",
      "The landlord may enter the unit without advance notice to inspect it or show it to an applicant.",
      "The landlord may add new parking and service fees at its sole discretion.",
      "The tenant waives all claims against the landlord for negligence in maintaining the premises.",
      "The early termination fee is $1,650.00, payable on the day the tenant returns the keys.",
      "All disputes must be resolved by binding arbitration.",
    ].join("\n"),
  },
  {
    id: "startup-job-offer",
    docType: "employment",
    title: "Startup Job Offer",
    text: [
      "Offer of employment from Fieldnote Labs for a full-time product operations role.",
      "The starting salary is $72,000 per year, paid on the company's regular payroll schedule.",
      "For 24 months after your employment ends, you may not work for any competitor worldwide.",
      "You assign all inventions and software to the company, including projects created on your own time.",
      "All employment disputes must be resolved by binding arbitration.",
      "You must repay the full $6,000 signing bonus if you resign in the first 18 months.",
      "You must be employed on the payment date to receive any earned performance bonus.",
      "Employees waive any right to overtime pay for evening and weekend launches.",
    ].join("\n"),
  },
  {
    id: "hospital-invoice",
    docType: "medical-bill",
    title: "Hospital Bill",
    text: [
      "Valley Grove Hospital patient billing statement for an outpatient visit on October 2, 2026.",
      "The statement lists charges before insurance adjustments.",
      "Outpatient facility fee (G0463) $275.00",
      "Blood draw (36415), 1 unit $28.00",
      "Blood draw (36415), 1 unit $28.00",
      "A high-complexity visit (99215) was billed for a routine follow-up.",
      "An out-of-network radiologist billed the remaining $380.00 as patient responsibility.",
      "Billing disputes must be submitted within 5 calendar days of this statement.",
      "Unpaid balances will be referred to a collection agency after 20 days.",
    ].join("\n"),
  },
  {
    id: "saas-terms",
    docType: "terms",
    title: "SaaS Terms of Service",
    text: [
      "Ledgerleaf Terms of Service for the hosted bookkeeping platform.",
      "Your workspace subscription renews automatically each month and all renewal charges are nonrefundable.",
      "We may raise subscription prices at any time without prior notice.",
      "You grant us a perpetual, irrevocable license to use content you upload to your workspace.",
      "We may sell your personal data to advertising partners.",
      "We may modify these terms without notice, effective upon posting to the platform.",
      "You waive your right to participate in any class action concerning the service.",
      "You can export account records from the settings page while your account is active.",
    ].join("\n"),
  },
];

export function getSampleById(id) {
  return SAMPLE_DOCUMENTS.find((sample) => sample.id === id);
}
