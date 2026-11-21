// Short values shared by pages, emails, auth labels and scripts. The first group describes this
// deployment and changes when someone else runs the software. The second describes the open
// source project.
// Keep this file free of imports so server code, client components and Node scripts can all load it.
export const siteConfig = {
  name: "Home Hub",
  tagline: "Connect with affordable housing",
  region: "Waterloo Region",
  operator: { name: "Union Community Housing", url: "https://unioncommunityhousing.org/" },
  contactEmail: "hello@unioncommunityhousing.org",
  feedbackFormUrl:
    "https://docs.google.com/forms/d/e/1FAIpQLSdmgdBsahBMIuU6AQngwArIKwCn_yJHZ299YtyT2FtT_FahCQ/viewform",
  bookingUrl: "https://calendar.app.google/Yc5KABhWMtDBFg5p7",
  mapCenter: { longitude: -80.52, latitude: 43.46 },

  builder: { name: "CivicTech", url: "https://civictechwr.org/" },
  repositoryUrl: "https://github.com/CivicTechWR/accessible-housing-portal",
} as const;
