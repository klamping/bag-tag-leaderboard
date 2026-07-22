module.exports = function configureEleventy(eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "site/styles": "styles" });
  eleventyConfig.addPassthroughCopy({ "site/favicon.svg": "favicon.svg" });
  eleventyConfig.addPassthroughCopy({ "site/favicon.png": "favicon.png" });

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
