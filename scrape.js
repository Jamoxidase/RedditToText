async function scrapeRedditContent() {
    // Extract post ID from URL
    const postId = window.location.pathname.split('/').filter(segment => segment.length > 0)[2];
    if (!postId) {
        console.error('Could not find post ID');
        return;
    }

    try {
        // Fetch the JSON data for the post and comments
        const response = await fetch(`${window.location.href}.json`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Extract post data from the first object
        const post = data[0].data.children[0].data;
        const postContent = {
            title: post.title,
            content: post.selftext,
            author: post.author,
            timestamp: new Date(post.created_utc * 1000).toISOString(),
            score: post.score,
            upvote_ratio: post.upvote_ratio
        };

        // Extract comments from the second object
        const comments = [];
        function processComments(children) {
            for (const child of children) {
                if (child.kind === 't1') {  // t1 is a comment
                    const comment = child.data;
                    comments.push({
                        author: comment.author,
                        content: comment.body,
                        timestamp: new Date(comment.created_utc * 1000).toISOString(),
                        score: comment.score,
                        id: comment.id,
                        parent_id: comment.parent_id,
                        depth: comment.depth
                    });

                    // Process replies if they exist
                    if (comment.replies && 
                        comment.replies.data && 
                        comment.replies.data.children) {
                        processComments(comment.replies.data.children);
                    }
                }
            }
        }

        // Start processing comments from the top level
        if (data[1] && data[1].data && data[1].data.children) {
            processComments(data[1].data.children);
        }

        // Combine all data
        const scrapedData = {
            post: postContent,
            comments: comments,
            metadata: {
                url: window.location.href,
                scraped_at: new Date().toISOString(),
                total_comments: comments.length
            }
        };

        // Convert to string with nice formatting
        const jsonString = JSON.stringify(scrapedData, null, 2);

        // Create and download file
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reddit-thread-${postId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`Successfully scraped ${comments.length} comments`);
        return scrapedData;
    } catch (error) {
        console.error('Error scraping Reddit content:', error);
        return null;
    }
}

// Execute the scraping
scrapeRedditContent().then(data => {
    if (data) {
        console.log('Scraping completed successfully!');
    }
});
