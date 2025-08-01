class Autopv < Formula
  desc "AutoPrivacy DSAR evidence-pack generator - Automated GDPR compliance for SaaS companies"
  homepage "https://github.com/autoprivacy/autopv-cli"
  url "https://github.com/autoprivacy/autopv-cli/releases/download/v0.2.0/autopv-macos"
  version "0.2.0"
  sha256 "PLACEHOLDER_SHA256_HASH"

  def install
    bin.install "autopv-macos" => "autopv"
  end

  test do
    system "#{bin}/autopv", "--version"
  end
end
