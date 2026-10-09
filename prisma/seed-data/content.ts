export const OFFER_TERMS: readonly string[] = [
    'Cash to close in 30 days, no financing contingency, proof of funds attached.',
    'Conventional financing at 25 percent down with a 21-day inspection window.',
    'Escalation to the stated cap in 50,000 increments, appraisal contingency retained.',
    'All cash, 45-day close, seller rent-back of up to 60 days offered at no cost.',
    'Standard contingencies with a pre-listing inspection report accepted in lieu of a repair credit.',
    'Above ask to pre-empt the weekend showings, with an escalation cap and proof of funds attached.',
];

export const OFFER_FEEDBACK: readonly string[] = [
    'The seller countered at a higher number and asked for a 30-day close, dropping the repair credit in exchange for a pre-listing inspection report.',
    'A counter arrived within the hour of the reduction, holding the ask close and asking you to waive the appraisal contingency.',
    'Delivered to the listing agent and acknowledged. The sellers are reviewing two other offers this week.',
    'Accepted at full ask. Escrow opened the same afternoon with a 45-day close.',
    'Rejected without a counter; the sellers took a cash offer at ask two days later.',
    'The inspection surfaced foundation work the sellers would not credit, so the terms were revised.',
];

export const VIEWING_NOTES: readonly string[] = [
    'Gate code released the morning of the tour; park on the motor court, not the street.',
    'Please allow ninety minutes so the guest house and the lower terrace can be walked.',
    'Buyer is travelling from out of state and would like the inspection contact on site.',
    'Second showing with the buyer architect joining to look at the rear elevation.',
    'Private tour ahead of the weekend open house at the buyer request.',
    'Virtual walkthrough with the full gallery and floor plans shared in advance.',
];

export const MESSAGE_SCRIPT: readonly string[] = [
    'Hello — I saw your interest in this property. Would you like to schedule a viewing?',
    'Yes, I would love to see it. What times are available this week?',
    'I can arrange the viewing for tomorrow at 2 PM if that works for you. The gardens are worth the early start.',
    'That works. Could you send the floor plans across before then?',
    'Sending the floor plans and the most recent comparable sales now.',
    'Thank you — reviewing them this evening and I will come back with questions.',
    'The inspection wrapped up this morning and the report is with the coordinator.',
    'Here are the updated inspection reports for your records.',
    'Understood. We are ready to move on terms if the sellers are.',
    'Just heard back — your offer has been accepted. Congratulations.',
];

export const AGENT_INTRO: readonly string[] = [
    'Delighted to help with this one — it is one of the quieter streets in the area.',
    'Happy to open it up privately if the weekend does not suit.',
    'The sellers are motivated and the file is clean, so timing is workable.',
];

export const MODERATION_REASONS: readonly string[] = [
    'An automated scan matched the second photograph to a stock library and the stated square footage does not reconcile with county records.',
    'Interior photographs belong to a different property and the copy repeats claims that cannot be verified.',
    'Replace the twilight exterior shots with daylight originals and remove the unverified school-district claim.',
    'The submitting licence lapsed in June and the gallery duplicates a listing already live under another agent.',
];

export const FLAG_REASONS: readonly string[] = [
    'Duplicate listing',
    'Misleading photography',
    'Unverified claims in the description',
    'Lapsed licence on the submitting account',
    'Suspected off-platform solicitation',
];

export const VERIFICATION_REJECTIONS: readonly string[] = [
    'Closed volume falls short of the platinum floor and the E&O policy is not on file. Re-apply once both are resolved.',
    'The uploaded licence image is cropped and the number cannot be read. Please resubmit a full-page scan.',
    'Document has expired. Upload a current licence and a matching photo ID.',
];

export const DOCUMENT_TYPES: readonly string[] = [
    'PASSPORT',
    'DRIVERS_LICENSE',
    'ID_CARD',
];

export const DISPUTE_SEEDS: readonly {
    title: string;
    description: string;
    resolved: boolean;
}[] = [
    {
        title: 'Inspection credit withheld at close',
        description:
            'The agreed repair credit did not appear on the closing statement and the escrow was released before the buyer could review it.',
        resolved: true,
    },
    {
        title: 'Listing photographs misrepresent the rear elevation',
        description:
            'The gallery shows a rebuilt rear elevation that was never permitted, and the buyer discovered the discrepancy after the inspection window closed.',
        resolved: true,
    },
    {
        title: 'Escrow held past the agreed release date',
        description:
            'Funds remained in escrow eleven days beyond the contractual release date with no written explanation from the seller side.',
        resolved: false,
    },
    {
        title: 'Undisclosed easement on the lower terrace',
        description:
            'A recorded access easement across the lower terrace was not disclosed in the property statement provided before offer.',
        resolved: false,
    },
];

export const DISPUTE_RESOLUTIONS: Record<
    'RELEASED' | 'REFUNDED',
    readonly string[]
> = {
    RELEASED: [
        'Credit reissued to the buyer from the seller proceeds and the closing statement was amended.',
        'The seller documented the delay and the buyer accepted a reduced holdback, so the funds were released.',
    ],
    REFUNDED: [
        'Listing corrected and the buyer was released from the contract without penalty.',
        'The undisclosed easement voids the offer terms, so the deposit was returned to the buyer.',
    ],
};

export const MEMBER_FLAG_SEEDS: readonly {
    reason: string;
    details: string | null;
    against: 'agent' | 'buyer';
}[] = [
    {
        reason: 'Asked for a deposit off the platform',
        details:
            'After the viewing he messaged me directly and asked me to wire a holding deposit to a personal account so the seller would take the house off the market.',
        against: 'agent',
    },
    {
        reason: 'Impersonating a listing agent',
        details:
            'This profile uses the name and photograph of an agent at another brokerage, who told me she has never heard of the account.',
        against: 'agent',
    },
    {
        reason: 'Repeated no-shows at viewings',
        details: null,
        against: 'buyer',
    },
    {
        reason: 'Pressure to waive the inspection',
        details:
            'Told me twice that the sellers would walk unless I waived the inspection, which the sellers later denied.',
        against: 'agent',
    },
    {
        reason: 'Fake proof of funds',
        details:
            'The bank letter attached to the offer names a branch that closed two years ago.',
        against: 'buyer',
    },
    {
        reason: 'Harassing follow-ups',
        details:
            'Calls several times a day after I said I was no longer interested in the property.',
        against: 'agent',
    },
];

export const MESSAGE_FLAG_SEEDS: readonly {
    content: string;
    from: 'agent' | 'buyer';
    reason: string;
    details: string | null;
}[] = [
    {
        content:
            'Wire the holding deposit to my personal account today and I will take it off the market for you.',
        from: 'agent',
        reason: 'Suspected off-platform payment',
        details: 'This is not the escrow the platform set up for the deal.',
    },
    {
        content:
            'Take it or leave it. You are wasting my time, and frankly you cannot afford this neighbourhood anyway.',
        from: 'agent',
        reason: 'Abusive language',
        details: 'I declined the counter politely and this was the reply.',
    },
    {
        content:
            'Here is the escrow portal for the deposit: secure-escrow-payments.co/hold',
        from: 'agent',
        reason: 'Suspicious payment link',
        details: null,
    },
    {
        content:
            'If the sellers do not drop the price I will tell every buyer on this street about the foundation.',
        from: 'buyer',
        reason: 'Threatening message',
        details:
            'The buyer is threatening to spread claims about the property unless the price drops.',
    },
    {
        content:
            'Text me on my private number instead, the platform reads everything.',
        from: 'agent',
        reason: 'Moving the conversation off the platform',
        details: null,
    },
];

export const FLAG_RESOLUTION_NOTES: Record<
    'RESOLVED' | 'DISMISSED',
    readonly string[]
> = {
    RESOLVED: [
        'Suspended for thirty days after a second report.',
        'Warned in writing; the account is on watch.',
    ],
    DISMISSED: [
        'The agent showed the buyer rescheduled each viewing.',
        "The link points to the platform's escrow partner.",
    ],
};

export const EVIDENCE_LABELS: readonly string[] = [
    'Closing statement',
    'Inspection addendum',
    'Message thread export',
    'Recorded easement',
    'Original gallery capture',
];

export const CONCIERGE_SERVICES: readonly { key: string; label: string }[] = [
    { key: 'international-relocation', label: 'International Relocation' },
    { key: 'estate-management', label: 'Estate Management' },
    { key: 'white-glove', label: '24/7 White-Glove' },
    { key: 'investment-advisory', label: 'Investment Advisory' },
];

export const CONCIERGE_PRACTICES: readonly {
    key: string;
    label: string;
    cadence: string;
}[] = [
    {
        key: 'portfolio-check-in',
        label: 'Monthly portfolio check-in',
        cadence: 'Monthly',
    },
    {
        key: 'off-market-first-look',
        label: 'Off-market first look',
        cadence: 'On listing',
    },
    {
        key: 'staging-desk',
        label: 'Staging & photography desk',
        cadence: 'Per mandate',
    },
    {
        key: 'specialist-intros',
        label: 'Specialist introductions',
        cadence: 'On request',
    },
];

export const CONCIERGE_CLIENTS: readonly {
    fullName: string;
    nextAction: string;
}[] = [
    { fullName: 'Robert Astor', nextAction: 'Portfolio review' },
    { fullName: 'Sophia Laurent', nextAction: 'Appraisal booking' },
    { fullName: 'Marcus Sterling', nextAction: 'Closing coordination' },
    { fullName: 'Elena Vasquez', nextAction: 'Off-market tour' },
    { fullName: 'Amara Okoye', nextAction: 'Financing intro' },
    { fullName: 'Julian Reyes', nextAction: 'Re-engagement call' },
];

export const CONCIERGE_REQUESTS: readonly string[] = [
    'Arrange a private viewing window ahead of the public launch.',
    'Coordinate the staging desk and photography for the coastal mandate.',
    'Introduce a structural engineer for the pre-offer survey.',
    'Prepare a comparative portfolio review for the quarter.',
    'Book the appraisal and align it with the financing timeline.',
    'Organise relocation logistics and school introductions.',
];

export const SAVED_SEARCH_NAMES: readonly string[] = [
    'Beverly Hills estates',
    'Coastal under 5M',
    'Four bed and up',
    'New to market this week',
    'Bel Air architectural',
    'Walkable and turnkey',
];

export const REVIEW_COMMENTS: readonly string[] = [
    'Clear communication from first enquiry to close, and the private tour was arranged within a day.',
    'Handled a complicated inspection window without drama and kept both sides informed.',
    'Knew the street and the comparables cold. The dossier was ready before we asked.',
    'Responsive and straight with us about what the sellers would and would not do.',
    'Closed ahead of schedule and the handover was faultless.',
];

export const SUSPENSION_REASONS: readonly string[] = [
    'Repeated listing policy violations after written warning',
    'Off-platform solicitation of buyers',
    'Unverified licence on a live mandate',
];

export const TRANSACTION_TERMS: readonly string[] = [
    'Cash purchase, 30-day close, escrow released on inspection sign-off.',
    'Conventional financing, 45-day close, standard contingencies retained.',
    'All cash with a 60-day seller rent-back at no cost.',
    'Financed at 25 percent down, inspection credit applied at close.',
];
