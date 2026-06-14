module.exports = function configureEleventy(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "site/styles": "styles" });

  return {
    dir: {
      input: "site",
      includes: "_includes",
      data: "_data",
      output: "dist",
    },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
