import { Octokit } from '@octokit/rest';

export interface GitHubExportResult {
    events: any[];
    audit: any[];
}

export class GitHubProvider {
    private octokit: Octokit;

    constructor(token: string) {
        this.octokit = new Octokit({
            auth: token,
        });
    }

    async exportUserData(username: string, org?: string): Promise<GitHubExportResult> {
        const result: GitHubExportResult = {
            events: [],
            audit: []
        };

        try {
            // Get user events using pagination
            const eventsIterator = this.octokit.paginate.iterator(
                this.octokit.rest.activity.listPublicEventsForUser,
                {
                    username,
                    per_page: 100
                }
            );

            for await (const { data: events } of eventsIterator) {
                result.events.push(...events);
                // Limit to reasonable number to avoid excessive API calls
                if (result.events.length >= 1000) {
                    break;
                }
            }

            // Get organization audit log if org is provided and token has admin:org scope
            if (org) {
                try {
                    const auditIterator = this.octokit.paginate.iterator(
                        'GET /orgs/{org}/audit-log' as any,
                        {
                            org,
                            per_page: 100
                        }
                    );

                    for await (const { data: auditEvents } of auditIterator) {
                        result.audit.push(...auditEvents);
                        // Limit to reasonable number
                        if (result.audit.length >= 500) {
                            break;
                        }
                    }
                } catch (auditError: any) {
                    // If we don't have admin:org permissions, that's okay
                    // We'll just have empty audit logs
                    console.warn(`Could not fetch audit logs for org ${org}:`, auditError.message);
                }
            }

        } catch (error: any) {
            throw new Error(`GitHub API error: ${error.message}`);
        }

        return result;
    }

    async exportUserDataByEmail(email: string, org?: string): Promise<GitHubExportResult> {
        try {
            // Search for users by email (this requires specific scopes and may not always work)
            const searchResult = await this.octokit.rest.search.users({
                q: `${email} in:email`
            });

            if (searchResult.data.items.length === 0) {
                throw new Error(`No GitHub user found with email: ${email}`);
            }

            // Use the first matching user
            const username = searchResult.data.items[0].login;
            return this.exportUserData(username, org);

        } catch (error: any) {
            // If email search fails, we can't proceed
            throw new Error(`Could not find GitHub user by email ${email}: ${error.message}`);
        }
    }
}
