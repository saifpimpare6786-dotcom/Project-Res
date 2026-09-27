import urllib.parse
import feedparser
import httpx
from typing import List, Dict, Any
from youtube_transcript_api import YouTubeTranscriptApi

class ScraperHub:
    """
    Legal, ToS-compliant data scrapers for GD topics and company intelligence:
    - Google News RSS / Indian Business News RSS
    - Public Reddit discussion search (developersIndia, India)
    - YouTube video transcripts (business/tech explainers)
    """

    @staticmethod
    def fetch_news_rss(query: str, max_items: int = 6) -> List[Dict[str, Any]]:
        """
        Fetches current news headlines, summaries, and source URLs via RSS feeds.
        Strictly legal, official open syndication.
        """
        results = []
        encoded_query = urllib.parse.quote(query)

        # Google News RSS for Indian region
        rss_url = f"https://news.google.com/rss/search?q={encoded_query}&hl=en-IN&gl=IN&ceid=IN:en"

        try:
            feed = feedparser.parse(rss_url)
            for entry in feed.entries[:max_items]:
                # Extract clean summary and source
                title = entry.get("title", "")
                link = entry.get("link", "")
                published = entry.get("published", "")
                source_title = entry.get("source", {}).get("title", "News Outlet")

                summary = entry.get("summary", "")
                # Clean html tags from summary if any
                clean_summary = summary.replace("<b>", "").replace("</b>", "").replace("&nbsp;", " ")

                results.append({
                    "source_type": "news_rss",
                    "title": title,
                    "snippet": f"{title}. {clean_summary}",
                    "source_url": link,
                    "publisher": source_title,
                    "retrieved_at": published,
                })
        except Exception as e:
            print(f"[ScraperHub] News RSS fetch error: {e}")

        return results

    @staticmethod
    def fetch_reddit_public(query: str, max_items: int = 5) -> List[Dict[str, Any]]:
        """
        Searches public Reddit discussions via Reddit's public JSON API.
        Focuses on Indian student & tech communities like r/developersIndia.
        ToS compliant, read-only.
        """
        results = []
        encoded_query = urllib.parse.quote(query)
        headers = {"User-Agent": "PrepSphere-LocalAgent/1.0 (Educational Placement Prep)"}

        subreddits = ["developersIndia", "IndiaInvestments", "india"]
        for sub in subreddits:
            if len(results) >= max_items:
                break
            url = f"https://www.reddit.com/r/{sub}/search.json?q={encoded_query}&restrict_sr=1&sort=relevance&limit=3"
            try:
                with httpx.Client(timeout=4.0) as client:
                    resp = client.get(url, headers=headers)
                    if resp.status_code == 200:
                        data = resp.json()
                        children = data.get("data", {}).get("children", [])
                        for child in children:
                            post = child.get("data", {})
                            title = post.get("title", "")
                            selftext = post.get("selftext", "")[:300]
                            permalink = f"https://reddit.com{post.get('permalink', '')}"
                            score = post.get("score", 0)

                            if title:
                                results.append({
                                    "source_type": "reddit_public",
                                    "title": f"[r/{sub}] {title}",
                                    "snippet": f"{title}. {selftext}",
                                    "source_url": permalink,
                                    "publisher": f"r/{sub} (Upvotes: {score})",
                                    "retrieved_at": "Recent community post"
                                })
            except Exception as e:
                # Silently failover if network or rate limit
                pass

        return results

    @staticmethod
    def fetch_youtube_transcripts(video_id: str) -> List[Dict[str, Any]]:
        """
        Fetches official YouTube video transcripts for given video ID without downloading media.
        """
        results = []
        try:
            transcript = YouTubeTranscriptApi.get_transcript(video_id)
            full_text = " ".join([chunk.get("text", "") for chunk in transcript[:50]])
            if full_text:
                results.append({
                    "source_type": "youtube_transcript",
                    "title": f"Video Analysis (ID: {video_id})",
                    "snippet": full_text[:600],
                    "source_url": f"https://youtube.com/watch?v={video_id}",
                    "publisher": "YouTube Business/Tech Analysis",
                    "retrieved_at": "Transcript extracted"
                })
        except Exception:
            pass
        return results

    def aggregate_sources(self, topic: str) -> List[Dict[str, Any]]:
        """Collects combined sources from News RSS and Reddit discussions."""
        news_items = self.fetch_news_rss(topic, max_items=5)
        reddit_items = self.fetch_reddit_public(topic, max_items=3)
        return news_items + reddit_items

scraper_hub = ScraperHub()
