// src/lib/constants/configurationTemplates.js (NEW FILE)
export const CONFIGURATION_TEMPLATES = {
  TOILET_FEATURES: {
    name: 'toilet_features',
    displayName: 'Toilet Features',
    description: 'Configuration for toilet/washroom features and amenities',
    category: 'facilities',
    defaultSchema: [
      {
        key: "isPaid",
        type: "boolean",
        label: "Paid Entry Required",
        category: "Access",
        required: false,
        defaultValue: false
      },
      {
        key: "isHandicapAccessible",
        type: "boolean",
        label: "Wheelchair Accessible",
        category: "Accessibility",
        required: false,
        defaultValue: false
      },
      {
        key: "genderAccess",
        type: "multiselect",
        label: "Available for Gender",
        options: [
          {"label": "Male", "value": "male"},
          {"label": "Female", "value": "female"},
          {"label": "Unisex/All Genders", "value": "unisex"},
          {"label": "Family Room", "value": "family"}
        ],
        category: "Access",
        required: true,
        defaultValue: []
      }
    ]
  },
  CLEANER_FEATURES: {
    name: 'cleaner_features',
    displayName: 'Cleaner Features',
    description: 'Configuration for cleaner-related features and requirements',
    category: 'staff',
    defaultSchema: [
      {
        key: "hasUniform",
        type: "boolean",
        label: "Uniform Required",
        category: "Appearance",
        required: false,
        defaultValue: true
      }
    ]
  },
  LOCATION_FEATURES: {
    name: 'location_features',
    displayName: 'Location Features',
    description: 'General location features and characteristics',
    category: 'facilities',
    defaultSchema: [
      {
        key: "hasParking",
        type: "boolean",
        label: "Parking Available",
        category: "Access",
        required: false,
        defaultValue: false
      }
    ]
  }
};

export const getTemplateByName = (name) => {
  return Object.values(CONFIGURATION_TEMPLATES).find(template => template.name === name);
};

export const getAllTemplates = () => {
  return Object.values(CONFIGURATION_TEMPLATES);
};
