import { applicationSchema, type ApplicationInput } from "@/lib/admissions/schema";

/** A complete, fictional application used by the tests. */
export function sampleInput(): ApplicationInput {
  return {
    applicant: {
      title: "Mrs", surname: "Dung", firstName: "Grace", middleName: "Naomi",
      relationship: "Mother", relationshipOther: "", email: "grace.dung@example.com", phone: "0803 000 1111",
    },
    father: {
      unavailable: false, unavailableReason: "", sameAddress: true,
      fullName: "Samuel Dung", occupation: "Civil engineer", phone: "0805 000 2222", homePhone: "",
      officePhone: "0809 000 3333", mobilePhone: "0805 000 2222", email: "samuel.dung@example.com",
      address: "",
    },
    mother: {
      unavailable: false, unavailableReason: "", sameAddress: false,
      fullName: "Grace Naomi Dung", occupation: "Pharmacist", phone: "0803 000 1111", homePhone: "",
      officePhone: "", mobilePhone: "0803 000 1111", email: "grace.dung@example.com",
      address: "No. 4 Example Close, Rayfield, Jos, Plateau State",
    },
    maritalStatus: "Married",
    custody: "",
    residentialAddress: "No. 4 Example Close, Rayfield, Jos, Plateau State",
    livesWith: "Both parents",
    hasOtherCustodians: "yes",
    otherCustodians: [{ name: "Ruth Dung", relationship: "Grandmother", workPhone: "0802 000 6666" }],
    child: {
      surname: "Dung", firstName: "Daniel", middleName: "Nanmwa", gender: "Male", dateOfBirth: "2019-03-14",
      placeOfBirth: "Jos University Teaching Hospital", stateOfOrigin: "Plateau", tribe: "Berom",
      religion: "Christianity", classSought: "Primary One", primaryLanguage: "English", homeLanguage: "English, Hausa",
    },
    homePhone: "",
    previousSchool: "",
    heardAbout: "A friend whose children attend Bomas",
    introduced: "yes",
    introducerName: "Mr. John Pam",
    introducerPhone: "0806 000 4444",
    childrenAtBomas: 1,
    hasOtherChildren: "yes",
    otherChildren: [{ name: "Esther Dung", dateOfBirth: "2016-07-02" }],
    transport: { bus: "", parentDropOff: "Mother drops off, father picks up", walksHome: "", other: "" },
    education: {
      neverAttended: false, presentSchool: "Little Stars Nursery School", dateFrom: "Sept 2022", dateTo: "July 2025",
      reasonForLeaving: "Completed nursery education", headTeacher: "Mrs. Helen Gyang, Head Teacher",
      schoolAddress: "12 Example Road, Rayfield, Jos", schoolPhone: "0807 000 5555", schoolEmail: "info@littlestars.example",
      languageOfInstruction: "English", hasDifficulties: "no", difficulties: "",
    },
    reasonForChoosing:
      "We want a school that combines strong academics with character building, and friends speak highly of the teachers and the brave, happy environment at Bomas.",
    health: {
      illnesses: {
        measles: { ticked: false, date: "" }, chickenPox: { ticked: true, date: "2021" },
        whoopingCough: { ticked: false, date: "" }, rubella: { ticked: false, date: "" }, typhoid: { ticked: true, date: "May 2023" },
      },
      inoculations: {
        smallPox: { ticked: false, date: "" }, measles: { ticked: true, date: "2020" }, polio: { ticked: true, date: "2019" },
        tetanus: { ticked: true, date: "2020" }, bcg: { ticked: true, date: "2019" },
      },
      otherVaccination: "yes", otherVaccinationType: "Yellow fever",
      hospitalAdmission: "no", hospitalAdmissionYear: "", hospitalAdmissionDetails: "",
      surgery: "no", surgeryDetails: "",
      ailments: { respiratory: "no", earNoseThroat: "no", eye: "no", otherInfirmityOrAllergy: "yes" },
      medication: "no", medicationDetails: "",
      hasOtherMedicalInfo: "yes",
      otherMedicalInfo: "Mild allergy to groundnuts.",
      hasSpecialInformation: "no",
      specialInformation: "",
    },
    documents: { fatherPassport: "bring", motherPassport: "bring", immunisationCard: "bring" },
    declarations: {
      schoolYearFrom: "2026", schoolYearTo: "2027",
      classFormDeclaration: true, homeSchoolAgreement: true, dataConsent: true,
      signatureName: "Grace Naomi Dung",
    },
  };
}

export function sampleData() {
  return applicationSchema.parse(sampleInput());
}
