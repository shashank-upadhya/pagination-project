import { useState, useEffect } from 'react';
import { DataTable } from 'primereact/datatable';
import { Paginator } from 'primereact/paginator';
import type { DataTableStateEvent, DataTableSelectionMultipleChangeEvent } from 'primereact/datatable';
import type { PaginatorPageChangeEvent } from 'primereact/paginator';
import { Column } from 'primereact/column';
import './App.css'

interface Artwork {
    id: number;
    title: string;
    place_of_origin: string | null;
    artist_display: string;
    inscriptions: string | null;
    date_start: number;
    date_end: number;
}

function App() {
    const [loading, setLoading] = useState<boolean>(false);
    const [artworks, setArtworks] = useState<Artwork[]>([]);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [selection, setSelection] = useState<Set<number>>(new Set());
    const [isPanelOpen, setPanelOpen] = useState<boolean>(false);
    const [numToSelect, setNumToSelect] = useState<string>('')
    const [lazyState, setLazyState] = useState<DataTableStateEvent>({
        first: 0,
        rows: 10,
        page: 0,
        sortField: '',
        sortOrder: null,
        filters: {},
        multiSortMeta: null,
    });

    useEffect(() => {
        const fetchArtworks = async () => {
            setLoading(true);
            const apiPage = lazyState.page ? lazyState.page + 1 : 1;
            const newFields = "id,title,place_of_origin,artist_display,inscriptions,date_start,date_end";
            const apiUrl = `https://api.artic.edu/api/v1/artworks?page=${apiPage}&limit=${lazyState.rows}&fields=${newFields}&sort[id]=asc`;
            
            try {
                const response = await fetch(apiUrl);
                const result = await response.json();
                setArtworks(result.data);
                setTotalRecords(result.pagination.total);
            } catch (e) {
                console.error("Failed to fetch artworks:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchArtworks();
    }, [lazyState]);
    
    const onPaginatorChange = (event: PaginatorPageChangeEvent) => {
        setLazyState(prevState => ({
            ...prevState,
            first: event.first,
            rows: event.rows,
            page: event.page
        }));
    }
    
    const handleSelectTopN = async (event: React.FormEvent) => {
    event.preventDefault();
    const count = parseInt(numToSelect, 10);

    if (isNaN(count) || count <= 0) {
        alert("Please enter a valid positive number.");
        return;
    }

    setLoading(true);

    try {
        //To get 1st count items
        const newFields = "id"; 
        const apiUrl = `https://api.artic.edu/api/v1/artworks?page=1&limit=${count}&fields=${newFields}&sort[id]=asc`;

        const response = await fetch(apiUrl);
        const result = await response.json();

        if (result.data) {
            const idsToSelect = result.data.map((art: Artwork) => art.id);
            setSelection(prevSelection => new Set([...prevSelection, ...idsToSelect]));
        }
    } catch (e) {
        console.error("Failed to fetch artwork IDs for selection:", e);
        alert("Could not select artworks. Please try again.");
    } finally {
        setLoading(false);
        setNumToSelect('');
        setPanelOpen(false);
    }
};

    const onSelectionChange = (event: DataTableSelectionMultipleChangeEvent<Artwork[]>) => {
    const newSelection = event.value;

    //get the IDs of all rows on current page
    const currentPageIds = new Set(artworks.map(art => art.id));

    //get the IDs of the newly selected rows on this page
    const newSelectionIds = new Set(newSelection.map(art => art.id));
    
    setSelection(prevSelection => {
        const updatedSelection = new Set(prevSelection);

        currentPageIds.forEach(id => {
            if (!newSelectionIds.has(id)) {
                updatedSelection.delete(id);
            }
        });

        //Add the newly selected IDs
        newSelectionIds.forEach(id => {
            updatedSelection.add(id);
        });
        
        return updatedSelection;
    });
};

const dateBodyTemplate = (rowData: Artwork) => {
        return `${rowData.date_start}–${rowData.date_end}`;
    };

    return (
    <div className="card m-4">
        <h1 className="text-3xl font-bold mb-4">Artworks from the Art Institute of Chicago</h1>
        <DataTable
            value={artworks}
            lazy loading={loading}
            dataKey="id"
            selectionMode="multiple"
            selection={artworks.filter(art => selection.has(art.id))}
            onSelectionChange={onSelectionChange}
            tableStyle={{ minWidth: '50rem' }}
            emptyMessage="No artworks found."
        >
            <Column
                selectionMode="multiple"
                headerStyle={{ width: '5rem' }}
                header={() => (
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <button className="p-link" onClick={() => setPanelOpen(!isPanelOpen)}>
                            <span className="pi pi-chevron-down"></span>
                        </button>

                        {isPanelOpen && (
                            <div className="selection-panel">
                                <form onSubmit={handleSelectTopN}>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="Select #"
                                        className="p-inputtext p-component p-inputtext-sm"
                                        style={{ width: '100px', marginRight: '8px' }}
                                        value={numToSelect}
                                        onChange={(e) => setNumToSelect(e.target.value)}
                                        autoFocus
                                        onClick={(e) => e.stopPropagation()} // Prevent table sort/filter
                                    />
                                    <button type="submit" className="p-button p-component p-button-sm">
                                        submit
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            />
            <Column field="title" header="Title" />
            <Column field="artist_display" header="Artist" />
            <Column field="place_of_origin" header="Place of Origin" />
            <Column field="inscriptions" header="Inscriptions" />
            <Column header="Date Range" body={dateBodyTemplate} style={{ minWidth: '140px' }} />
        </DataTable>
        
        <Paginator
            first={lazyState.first}
            rows={lazyState.rows}
            totalRecords={totalRecords}
            onPageChange={onPaginatorChange}
            rowsPerPageOptions={[10, 20, 50]}
            className="justify-content-end"
        />
        
        <p className="mt-4">
            <strong>Total Selected: {selection.size}</strong>
        </p>
    </div>
);
}

export default App;