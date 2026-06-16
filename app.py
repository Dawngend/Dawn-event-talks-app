from flask import Flask, jsonify, render_template, request
import urllib.request
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import os
import json
import time
from datetime import datetime

app = Flask(__name__)

CACHE_FILE = 'releases_cache.json'
CACHE_DURATION = 3600  # 1 hour in seconds
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    try:
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) BigQueryReleaseNotesViewer/1.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
        
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        
        parsed_updates = []
        uid_counter = 0
        
        for entry in root.findall('atom:entry', ns):
            date_str = entry.find('atom:title', ns).text
            updated_time = entry.find('atom:updated', ns).text
            link_el = entry.find('atom:link', ns)
            link = link_el.attrib.get('href', '') if link_el is not None else ''
            content_html = entry.find('atom:content', ns).text
            
            if not content_html:
                continue
                
            soup = BeautifulSoup(content_html, 'html.parser')
            
            current_type = "General"
            current_elements = []
            
            for child in soup.contents:
                if child.name == 'h3':
                    # Save previous update if exists
                    if current_elements:
                        desc_html = "".join([str(el) for el in current_elements]).strip()
                        desc_text = BeautifulSoup(desc_html, 'html.parser').get_text(separator=" ").strip()
                        uid_counter += 1
                        parsed_updates.append({
                            'id': f"update-{uid_counter}",
                            'date': date_str,
                            'updated_time': updated_time,
                            'link': link,
                            'type': current_type,
                            'description_html': desc_html,
                            'description_text': desc_text
                        })
                    current_type = child.get_text().strip()
                    current_elements = []
                elif child.name is not None:
                    current_elements.append(child)
                    
            # Append the last one
            if current_elements or current_type != "General":
                desc_html = "".join([str(el) for el in current_elements]).strip()
                desc_text = BeautifulSoup(desc_html, 'html.parser').get_text(separator=" ").strip()
                uid_counter += 1
                parsed_updates.append({
                    'id': f"update-{uid_counter}",
                    'date': date_str,
                    'updated_time': updated_time,
                    'link': link,
                    'type': current_type,
                    'description_html': desc_html,
                    'description_text': desc_text
                })
                
        cache_data = {
            'last_fetched': time.time(),
            'updates': parsed_updates
        }
        
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
            
        return parsed_updates, "live"
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # Try to fallback to cache if available
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                return cache_data['updates'], "fallback_cache"
            except Exception:
                pass
        raise e

def get_updates(force_refresh=False):
    if force_refresh or not os.path.exists(CACHE_FILE):
        return fetch_and_parse_feed()
        
    try:
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            cache_data = json.load(f)
            
        age = time.time() - cache_data.get('last_fetched', 0)
        if age > CACHE_DURATION:
            # Refresh in background or inline. Let's do inline for simplicity
            return fetch_and_parse_feed()
            
        return cache_data['updates'], "cache"
    except Exception:
        return fetch_and_parse_feed()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        updates, source = get_updates(force_refresh)
        
        # Get cache age if cache exists
        last_fetched_time = None
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r') as f:
                    cache_data = json.load(f)
                last_fetched_time = cache_data.get('last_fetched')
            except Exception:
                pass
        
        last_fetched_dt = datetime.fromtimestamp(last_fetched_time).isoformat() if last_fetched_time else None
        
        return jsonify({
            'status': 'success',
            'source': source,
            'last_updated': last_fetched_dt,
            'count': len(updates),
            'updates': updates
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    # Default to port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)
