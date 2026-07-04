function isValidUrl(value) {
  if (!value || typeof value !== "string" || value.trim() === "") {
    return false;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function validateMonitorUrl(req, res, next) {
  const { url, urls } = req.body;
  let urlList = [];

  if (urls !== undefined) {
    if (!Array.isArray(urls)) {
      return res.status(400).json({ error: "urls must be an array" });
    }
    urlList = urls;
  } else if (url !== undefined) {
    urlList = [url];
  } else {
    return res.status(400).json({ error: "At least one URL is required" });
  }

  if (urlList.length === 0) {
    return res.status(400).json({ error: "At least one URL is required" });
  }

  const invalidUrls = urlList.filter((item) => !isValidUrl(item));
  if (invalidUrls.length > 0) {
    return res.status(400).json({
      error: "Invalid URL format",
      invalid_urls: invalidUrls,
    });
  }

  req.validatedUrls = [...new Set(urlList.map((item) => item.trim()))];
  next();
}

module.exports = { validateMonitorUrl };
