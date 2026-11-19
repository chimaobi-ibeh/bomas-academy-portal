/**
 * Wording copied from the original Bomas Academy paper forms (C:\...\bomas forms\*.pdf).
 * Do not paraphrase. Only obvious misprints in field labels were corrected
 * ("pervious" -> "previous", "fo" -> "of", "chilcl" -> "child"); see docs/admissions/PLAN.md.
 */

/** Header details printed on the forms (question Q10: the website shows a different address). */
export const FORM_HEADER = {
  address: ["No. 16 Naraguta Avenue", "G.R.A, Jos Plateau State"],
  classFormAddress: "No. 16 Naraguta Avenue G.R.A, Plateau State Jos.",
  phones: ["08036058313,", "08168262600,", "08111487859"],
  email: "bomasacademy@gmail.com",
  motto: "...inspiring learning for greatness",
};

export const FORM1_NOTICE = [
  "THIS FORM DOES NOT GUARANTEE ADMISSION",
  "Applications for placement in Bomas Academy",
  "who are NOT either the Father or Mother of the",
  "child(or Children) they are enrolling, Must delete the",
  "word PARENT and insert their ownstatus in regard to",
  "that child (or Children) e.g UNCLE, COUSIN.",
];

export const FORM1_ACCOMPANIED_BY = [
  "This form must be accompanied by:",
  "1. Two passport photographs of the Child",
  "2. Original (for sighting only) and",
  "Photocopy of the child's birth certificate",
  "3. Parents' Passport photographs",
  "4. Photocopy of immunization card",
];

export const FORM1_AGREEMENT_LINE_1 =
  "I have read, understood and agreed to the conditions set out in the Home/School";
export const FORM1_AGREEMENT_LINE_2 = "Agreement and wish to enroll my child";

export const CLASS_FORM_DECLARATION = {
  start: "In making this application for my child, it is my desire to have him/her complete the school year:",
  rest:
    "It is also my understanding that the policy of the school is to make no refunds on registration fees. I also give permission for my child to take part in all school activities, including sports and school sponsored trips away from the school premises. I also agree to pay the stipulated fee on failure to pick my child as at when due.",
};

export const HOME_SCHOOL_AGREEMENT = {
  title: "HOME/SCHOOL AGREEMENT",
  convention: {
    heading: "United Nations Convention on the Rights of the Child.",
    lines: [
      "Article 28 & 29: Every child has... the right to education",
      "Article 18,19 & 24: Every child has...the right to feel safe",
      "Every child has... the right to be respected.",
    ],
  },
  sections: [
    {
      heading: "Child's Responsibilities",
      items: [
        "I will have everything ready to leave on time.",
        "I will come to school happy and ready to learn.",
        "I will try my best.",
        "I will learn from my mistakes and complete task on time.",
        "I will ask for help or seek support from a known adult when I need it.",
        "I will behave well during the school day, at any clubs and on school trips.",
        "I will behave respectfully at any extra-curricular events.",
        "I will show respect to staff, other children and my parents/carers.",
      ],
    },
    {
      heading: "Family's Responsibilities",
      items: [
        "We will make sure our child has all they need for school.",
        "We will make sure that our child has the best possible attendance, arriving and leaving on time.",
        "We will talk to our child about their learning.",
        "We will attend parent meetings about our child's progress.",
        "We will provide our child with the appropriate school uniform.",
        "We will encourage our child to speak to someone when they need to and listen to them at home.",
        "We will ask for help if we need it.",
        "We will model positive behavior.",
        "We will attend events where possible.",
        "We will suggest new ideas.",
        "We will work in partnership with class teachers.",
        "We will show respect to the school staff and other families at school.",
      ],
    },
    {
      heading: "School's Responsibilities",
      items: [
        "We will provide a stimulating creative and balanced curriculum.",
        "We will track your child's progress and support them if necessary.",
        "We will monitor attendance and speak with you when your child is falling below in attendance.",
        "We will expect all children to wear appropriate uniform.",
        "We will keep your child safe when they are with us and do everything we can to support their individual needs.",
        "We will actively involve families in our events/programs.",
        "We will treat each child with dignity and respect when managing their behavior.",
        "We will provide activities and events that will interest pupils of all ages and encourage families to attend and share ideas.",
        "We will respect our families and all who work here promoting the rights of all our community.",
      ],
    },
  ],
};

/** Items Form 1 asks for that are not uploaded online (question Q3). */
export const BRING_TO_SCHOOL = [
  "A second passport photograph of the child",
  "The original birth certificate (for sighting only)",
  "Parents' passport photographs",
  "A photocopy of the child's immunization card",
  "A surgical report, if your child has had an operation",
  "Form 2 signed and stamped by the head teacher of your child's present school (if applicable)",
];

export const PAYMENT_DISCLAIMER =
  "Payment of the application fee does not constitute admission into Bomas Academy.";
