import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import axios, { AxiosInstance } from 'axios';

/**
 * Help Desk Client Service
 * 
 * Complete service untuk integrate dengan Help Desk API
 * Dapat digunakan di client application maupun di backend server
 * 
 * Usage:
 * const client = new HelpDeskClient('https://api.yourdomain.com', 'your_api_token');
 * const tickets = await client.getTickets();
 */

export class HelpDeskClient {
    private baseURL: string;
    private token: string;
    private apiClient: AxiosInstance;

    constructor(baseURL: string, token: string) {
        this.baseURL = baseURL;
        this.token = token;
        
        // Initialize axios client
        this.apiClient = axios.create({
            baseURL,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Get all tickets with filters
     */
    async getTickets(filters?: {
        status?: string;
        priority?: string;
        category?: string;
        search?: string;
        page?: number;
        per_page?: number;
    }) {
        const response = await this.apiClient.get('/tickets', { params: filters });
        return response.data;
    }

    /**
     * Get customer's own tickets
     */
    async getMyTickets(filters?: {
        status?: string;
        page?: number;
        per_page?: number;
    }) {
        const response = await this.apiClient.get('/tickets/my-tickets', { params: filters });
        return response.data;
    }

    /**
     * Create new ticket
     */
    async createTicket(data: {
        customer_id: number;
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high' | 'urgent';
        category: 'billing' | 'technical' | 'service' | 'complaint' | 'other';
    }) {
        const response = await this.apiClient.post('/tickets', data);
        return response.data;
    }

    /**
     * Get ticket details
     */
    async getTicket(ticketId: number) {
        const response = await this.apiClient.get(`/tickets/${ticketId}`);
        return response.data;
    }

    /**
     * Update ticket
     */
    async updateTicket(ticketId: number, data: {
        title?: string;
        description?: string;
        status?: string;
        priority?: string;
        category?: string;
        assigned_to?: number | null;
        resolution_notes?: string;
    }) {
        const response = await this.apiClient.patch(`/tickets/${ticketId}`, data);
        return response.data;
    }

    /**
     * Delete ticket
     */
    async deleteTicket(ticketId: number) {
        const response = await this.apiClient.delete(`/tickets/${ticketId}`);
        return response.data;
    }

    /**
     * Add reply to ticket
     */
    async addReply(ticketId: number, message: string, isInternal: boolean = false) {
        const response = await this.apiClient.post(`/tickets/${ticketId}/replies`, {
            message,
            is_internal: isInternal
        });
        return response.data;
    }

    /**
     * Get ticket replies
     */
    async getReplies(ticketId: number, page: number = 1, perPage: number = 20) {
        const response = await this.apiClient.get(`/tickets/${ticketId}/replies`, {
            params: { page, per_page: perPage }
        });
        return response.data;
    }

    /**
     * Delete reply
     */
    async deleteReply(ticketId: number, replyId: number) {
        const response = await this.apiClient.delete(`/tickets/${ticketId}/replies/${replyId}`);
        return response.data;
    }

    /**
     * Get statistics
     */
    async getStatistics() {
        const response = await this.apiClient.get('/tickets/stats/summary');
        return response.data;
    }
}

/**
 * React Hook untuk Help Desk Client
 * 
 * Usage dalam component:
 * const client = useHelpDeskClient('https://api.yourdomain.com', token);
 * const { tickets, loading } = useTicketsList(client);
 */
export function useHelpDeskClient(baseURL: string, token: string) {
    const [client] = useState(() => new HelpDeskClient(baseURL, token));

    return {
        getTickets: client.getTickets.bind(client),
        getMyTickets: client.getMyTickets.bind(client),
        createTicket: client.createTicket.bind(client),
        getTicket: client.getTicket.bind(client),
        updateTicket: client.updateTicket.bind(client),
        deleteTicket: client.deleteTicket.bind(client),
        addReply: client.addReply.bind(client),
        getReplies: client.getReplies.bind(client),
        deleteReply: client.deleteReply.bind(client),
        getStatistics: client.getStatistics.bind(client),
    };
}

/**
 * Hook untuk manage tickets list
 */
export function useTicketsList(client: ReturnType<typeof useHelpDeskClient>, initialFilters?: any) {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState(initialFilters || {});
    const [pagination, setPagination] = useState({ page: 1, perPage: 15, total: 0 });

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await client.getTickets({
                ...filters,
                page: pagination.page,
                per_page: pagination.perPage
            });

            setTickets(result.data.data);
            setPagination((prev: any) => ({
                ...prev,
                total: result.data.total,
                page: result.data.current_page
            }));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch tickets');
        } finally {
            setLoading(false);
        }
    }, [client, filters, pagination.page, pagination.perPage]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    return {
        tickets,
        loading,
        error,
        filters,
        setFilters: (newFilters: any) => {
            setFilters(newFilters);
            setPagination(prev => ({ ...prev, page: 1 }));
        },
        pagination,
        goToPage: (page: number) => setPagination(prev => ({ ...prev, page })),
        refetch: fetchTickets
    };
}

/**
 * Hook untuk manage single ticket
 */
export function useTicket(client: ReturnType<typeof useHelpDeskClient>, ticketId: number) {
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTicket = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await client.getTicket(ticketId);
            setTicket(result.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch ticket');
        } finally {
            setLoading(false);
        }
    }, [client, ticketId]);

    useEffect(() => {
        fetchTicket();
    }, [fetchTicket]);

    const updateTicket = useCallback(async (data: any) => {
        try {
            const result = await client.updateTicket(ticketId, data);
            setTicket(result.data);
            return result.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update ticket');
            throw err;
        }
    }, [client, ticketId]);

    return {
        ticket,
        loading,
        error,
        refetch: fetchTicket,
        updateTicket
    };
}

/**
 * Hook untuk manage ticket replies
 */
export function useTicketReplies(client: ReturnType<typeof useHelpDeskClient>, ticketId: number) {
    const [replies, setReplies] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);

    const fetchReplies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await client.getReplies(ticketId, page);
            setReplies(result.data.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch replies');
        } finally {
            setLoading(false);
        }
    }, [client, ticketId, page]);

    useEffect(() => {
        fetchReplies();
    }, [fetchReplies]);

    const addReply = useCallback(async (message: string, isInternal: boolean = false) => {
        try {
            const result = await client.addReply(ticketId, message, isInternal);
            setReplies((prev: any) => [...prev, result.data]);
            return result.data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to add reply');
            throw err;
        }
    }, [client, ticketId]);

    const deleteReply = useCallback(async (replyId: number) => {
        try {
            await client.deleteReply(ticketId, replyId);
            setReplies((prev: any) => prev.filter((r: any) => r.id !== replyId));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete reply');
            throw err;
        }
    }, [client, ticketId]);

    return {
        replies,
        loading,
        error,
        page,
        setPage,
        refetch: fetchReplies,
        addReply,
        deleteReply
    };
}

/**
 * Example React Component untuk integrate Help Desk
 */
export function HelpDeskWidget() {
    const apiUrl = typeof window !== 'undefined' && (window as any).__APP_CONFIG__?.API_URL 
        ? (window as any).__APP_CONFIG__.API_URL 
        : 'https://api.yourdomain.com';
    
    const apiToken = typeof window !== 'undefined' && (window as any).__APP_CONFIG__?.API_TOKEN 
        ? (window as any).__APP_CONFIG__.API_TOKEN 
        : '';

    const client = useHelpDeskClient(apiUrl, apiToken);

    const { tickets, loading, filters, setFilters, pagination, goToPage } = useTicketsList(client);

    if (loading) return React.createElement('div', null, 'Loading tickets...');

    return React.createElement(
        'div',
        { className: 'help-desk-widget' },
        React.createElement('h2', null, 'Help Desk Tickets'),

        // Filters
        React.createElement(
            'div',
            { className: 'filters' },
            React.createElement(
                'select',
                {
                    value: filters.status || '',
                    onChange: (e: any) => setFilters({ ...filters, status: e.target.value }),
                },
                React.createElement('option', { value: '' }, 'All Status'),
                React.createElement('option', { value: 'open' }, 'Open'),
                React.createElement('option', { value: 'in_progress' }, 'In Progress'),
                React.createElement('option', { value: 'resolved' }, 'Resolved')
            )
        ),

        // Tickets Table
        React.createElement(
            'table',
            null,
            React.createElement(
                'thead',
                null,
                React.createElement(
                    'tr',
                    null,
                    React.createElement('th', null, 'No. Tiket'),
                    React.createElement('th', null, 'Judul'),
                    React.createElement('th', null, 'Status'),
                    React.createElement('th', null, 'Prioritas'),
                    React.createElement('th', null, 'Created')
                )
            ),
            React.createElement(
                'tbody',
                null,
                tickets.map((ticket: any) =>
                    React.createElement(
                        'tr',
                        { key: ticket.id },
                        React.createElement('td', null, ticket.ticket_number),
                        React.createElement('td', null, ticket.title),
                        React.createElement('td', null, ticket.status),
                        React.createElement('td', null, ticket.priority),
                        React.createElement('td', null, new Date(ticket.created_at).toLocaleDateString())
                    )
                )
            )
        ),

        // Pagination
        React.createElement(
            'div',
            { className: 'pagination' },
            React.createElement(
                'button',
                {
                    onClick: () => goToPage(pagination.page - 1),
                    disabled: pagination.page === 1,
                },
                'Previous'
            ),
            React.createElement('span', null, `Page ${pagination.page}`),
            React.createElement(
                'button',
                {
                    onClick: () => goToPage(pagination.page + 1),
                },
                'Next'
            )
        )
    );
}

/**
 * Example Usage
 */
export async function exampleUsage() {
    // Initialize client
    const client = new HelpDeskClient(
        'https://api.yourdomain.com',
        'YOUR_API_TOKEN'
    );

    try {
        // Get all tickets
        const allTickets = await client.getTickets({ status: 'open' });
        console.log('Open tickets:', allTickets.data.data);

        // Create new ticket
        const newTicket = await client.createTicket({
            customer_id: 1,
            title: 'Internet connection issue',
            description: 'Connection is unstable',
            priority: 'high',
            category: 'technical'
        });
        console.log('Created ticket:', newTicket.data.ticket_number);

        // Get ticket details
        const ticketDetails = await client.getTicket(newTicket.data.id);
        console.log('Ticket details:', ticketDetails.data);

        // Add reply
        const reply = await client.addReply(
            newTicket.data.id,
            'We received your report and will investigate.'
        );
        console.log('Added reply:', reply.data.message);

        // Update ticket status
        const updated = await client.updateTicket(newTicket.data.id, {
            status: 'in_progress',
            assigned_to: 2
        });
        console.log('Updated ticket:', updated.data);

        // Get statistics
        const stats = await client.getStatistics();
        console.log('Statistics:', stats.data);

    } catch (error) {
        console.error('Error:', error);
    }
}
