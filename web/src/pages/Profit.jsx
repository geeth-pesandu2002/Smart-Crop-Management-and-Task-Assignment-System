
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPlots, getPlot, listResourceUsages } from "../api.js";
import { listProfits, createOrUpdateProfit, updateProfit, deleteProfit } from "../api/profit";

// Helper to get dashboard path (copied from Reports.jsx)
function getDashboardPath() {
	const fromEnv = import.meta?.env?.VITE_DASHBOARD_PATH;
	if (fromEnv) return fromEnv;
	// fallback for manager
	return "/manager";
}
const DASHBOARD_PATH = getDashboardPath();

const labelStyle = {
	display: "block",
	fontWeight: 600,
	marginBottom: 6,
	color: "#22223b"
};
const inputStyle = {
	padding: "8px 12px",
	border: "1px solid #cbd5e1",
	borderRadius: 6,
	fontSize: 15,
	width: "100%",
	background: "#f8fafc"
};
const cardStyle = {
	border: "1px solid #e0e7ef",
	borderRadius: 12,
	padding: 28,
	background: "#fff",
	boxShadow: "0 2px 12px rgba(34, 60, 80, 0.07)",
	marginTop: 24,
	transition: "box-shadow 0.2s"
};
const valueStyle = {
	fontWeight: 600,
	color: "#22223b",
	fontSize: 18,
	letterSpacing: 0.2
};
const profitStyle = {
	fontWeight: 700,
	fontSize: 22,
	color: "#16a34a",
	marginTop: 18
};
const labelRow = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 };



const Profit = () => {
	const [plots, setPlots] = useState([]);
	const [selectedPlotId, setSelectedPlotId] = useState("");
	const [selectedDate, setSelectedDate] = useState("");
	const [plotData, setPlotData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [totalCost, setTotalCost] = useState(0);
	const [profits, setProfits] = useState([]);
	const [editingId, setEditingId] = useState(null);
	const [notes, setNotes] = useState("");
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const pageSize = 5;


	useEffect(() => {
		getPlots({ withStats: true, limit: 100 }).then(res => {
			setPlots(res.items || []);
		});
	}, []);

	const fetchProfits = (pg = page) => {
		listProfits({ limit: pageSize, skip: (pg - 1) * pageSize }).then(res => {
			setProfits(res.items || []);
			setTotal(res.total || 0);
		});
	};

	useEffect(() => {
		fetchProfits(page);
		// eslint-disable-next-line
	}, [page]);

	useEffect(() => {
		if (!selectedPlotId) {
			setPlotData(null);
			setTotalCost(0);
			return;
		}
		setLoading(true);
		getPlot(selectedPlotId).then(data => {
			setPlotData(data);
			setLoading(false);
		});
	}, [selectedPlotId]);

	// Fetch total cost for the selected plot (ignore date)
	useEffect(() => {
		if (!selectedPlotId) {
			setTotalCost(0);
			return;
		}
		const params = { plotId: selectedPlotId, limit: 1000 };
		listResourceUsages(params).then(res => {
			const cost = (res.items || []).reduce((s, r) => s + (r.cost || 0), 0);
			setTotalCost(cost);
		});
	}, [selectedPlotId]);


	// Sum all harvests for the selected plot
	let harvestedQty = 0, discardedQty = 0, earnings = 0;
	if (plotData && plotData.harvests && plotData.harvests.length > 0) {
		for (const h of plotData.harvests) {
			harvestedQty += h.harvestedQty || 0;
			discardedQty += h.discardedQty || 0;
			earnings += h.earnings || 0;
		}
	}
	const profit = earnings - totalCost;

	// Save or update profit record
	const handleSave = async () => {
		if (!selectedPlotId || !selectedDate) return alert("Select plot and date");
		const payload = {
			plot: selectedPlotId,
			date: selectedDate,
			harvestedQty,
			discardedQty,
			earnings,
			cost: totalCost,
			profit,
			notes
		};
		await createOrUpdateProfit(payload);
		fetchProfits(page);
		setEditingId(null);
		setNotes("");
		alert("Profit record saved.");
	};

	// Edit profit record
	const handleEdit = (rec) => {
		setEditingId(rec._id);
		setSelectedPlotId(rec.plot?._id || rec.plot);
		setSelectedDate(rec.date?.slice(0,10));
		setNotes(rec.notes || "");
	};

	// Delete profit record
	const handleDelete = async (id) => {
		if (!window.confirm("Delete this profit record?")) return;
		await deleteProfit(id);
		// If deleting last item on page, go to previous page if needed
		if (profits.length === 1 && page > 1) setPage(page - 1);
		else fetchProfits(page);
		if (editingId === id) setEditingId(null);
	};

		const handleDownloadPdf = (id) => {
			// Use backend base URL for PDF download
			const base = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
			window.open(`${base}/pdf/profit/${id}`, '_blank');
		};

		return (
			<div style={{ padding: 32, maxWidth: 700, margin: "0 auto", fontFamily: 'Segoe UI, Arial, sans-serif' }}>
				{/* Top bar: Dashboard button right */}
				<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
					<h2 style={{ fontWeight: 800, margin: 0, letterSpacing: 0.5, fontSize: 32, color: "#22223b" }}>Profit Calculator</h2>
					<Link to={DASHBOARD_PATH}>
						<button
							style={{
								background: "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
								color: "#fff",
								fontWeight: 700,
								padding: "10px 22px",
								borderRadius: "999px",
								border: "none",
								boxShadow: "0 2px 8px rgba(34,197,94,0.10)",
								letterSpacing: "0.5px",
								fontSize: "15px",
								transition: "background 0.2s, box-shadow 0.2s",
								cursor: "pointer"
							}}
							onMouseOver={e => {
								e.currentTarget.style.background = "linear-gradient(90deg, #16a34a 0%, #22c55e 100%)";
								e.currentTarget.style.boxShadow = "0 4px 16px rgba(34,197,94,0.18)";
							}}
							onMouseOut={e => {
								e.currentTarget.style.background = "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)";
								e.currentTarget.style.boxShadow = "0 2px 8px rgba(34,197,94,0.10)";
							}}
						>
							Dashboard
						</button>
					</Link>
				</div>
			<div style={{ ...labelRow }}>
				<label style={labelStyle} htmlFor="plot-select">Plot Name</label>
				<select
					id="plot-select"
					value={selectedPlotId}
					onChange={e => setSelectedPlotId(e.target.value)}
					style={{ ...inputStyle, maxWidth: 260 }}
				>
					<option value="">Select a plot</option>
					{plots.map(p => (
						<option key={p._id} value={p._id}>{p.fieldName} ({p.cropType})</option>
					))}
				</select>
			</div>
			<div style={{ ...labelRow }}>
				<label style={labelStyle} htmlFor="date-input">Date</label>
				<input
					id="date-input"
					type="date"
					value={selectedDate}
					onChange={e => setSelectedDate(e.target.value)}
					style={{ ...inputStyle, maxWidth: 180 }}
				/>
			</div>
			<div style={{ ...labelRow }}>
				<label style={labelStyle} htmlFor="notes-input">Notes</label>
				<input
					id="notes-input"
					type="text"
					value={notes}
					onChange={e => setNotes(e.target.value)}
					style={{ ...inputStyle, maxWidth: 400 }}
					placeholder="Optional notes..."
				/>
			</div>
			{loading && <div style={{ textAlign: "center", margin: 16, color: "#888" }}>Loading...</div>}
			<div style={cardStyle}>
				<div style={labelRow}>
					<span style={labelStyle}>Quantity Harvested</span>
					<span style={valueStyle}>{selectedPlotId ? harvestedQty : ""}</span>
				</div>
				<div style={labelRow}>
					<span style={labelStyle}>Quantity Discarded</span>
					<span style={valueStyle}>{selectedPlotId ? discardedQty : ""}</span>
				</div>
				<div style={labelRow}>
					<span style={labelStyle}>Total Earnings</span>
					<span style={valueStyle}>{selectedPlotId ? `LKR ${earnings.toLocaleString()}` : ""}</span>
				</div>
				<div style={labelRow}>
					<span style={labelStyle}>Total Cost</span>
					<span style={valueStyle}>{selectedPlotId ? `LKR ${totalCost.toLocaleString()}` : ""}</span>
				</div>
				<div style={profitStyle}>
					Profit: {selectedPlotId ? `LKR ${profit.toLocaleString()}` : ""}
				</div>
			</div>
			<div style={{ textAlign: "center", marginTop: 24 }}>
				<button
					className="btn"
					style={{
						background: "linear-gradient(90deg, #22c55e 0%, #16a34a 100%)",
						color: "#fff",
						fontWeight: 700,
						padding: "10px 32px",
						borderRadius: "999px",
						border: "none",
						fontSize: 16,
						marginTop: 8,
						cursor: "pointer"
					}}
					onClick={handleSave}
				>
					{editingId ? "Update Record" : "Save Profit Record"}
				</button>
			</div>
			<h3 style={{ marginTop: 48, marginBottom: 16, color: "#22223b" }}>Saved Profit Records</h3>
						<div style={{ overflowX: "auto" }}>
							<table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
								<thead>
									<tr style={{ background: "#f1f5f9" }}>
										<th style={{ padding: 8, borderBottom: "1px solid #e0e7ef" }}>Plot</th>
										<th style={{ padding: 8, borderBottom: "1px solid #e0e7ef" }}>Date</th>
										<th style={{ padding: 8, borderBottom: "1px solid #e0e7ef" }}>Harvested</th>
										<th style={{ padding: 8, borderBottom: "1px solid #e0e7ef" }}>Discarded</th>
										<th style={{ padding: 8, borderBottom: "1px solid #e0e7ef" }}>Earnings</th>
										<th style={{ padding: 8, borderBottom: "1px solid #e0e7ef" }}>Cost</th>
										<th style={{ padding: 8, borderBottom: "1px solid #e0e7ef" }}>Profit</th>
										<th style={{ padding: 8, borderBottom: "1px solid #e0e7ef" }}>Notes</th>
										<th style={{ padding: 8, borderBottom: "1px solid #e0e7ef" }}>Actions</th>
									</tr>
								</thead>
								<tbody>
									{profits.map((rec) => (
										<tr key={rec._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
											<td style={{ padding: 8 }}>{rec.plot?.fieldName || ""}</td>
											<td style={{ padding: 8 }}>{rec.date?.slice(0, 10)}</td>
											<td style={{ padding: 8, textAlign: "right" }}>{rec.harvestedQty}</td>
											<td style={{ padding: 8, textAlign: "right" }}>{rec.discardedQty}</td>
											<td style={{ padding: 8, textAlign: "right" }}>LKR {rec.earnings?.toLocaleString()}</td>
											<td style={{ padding: 8, textAlign: "right" }}>LKR {rec.cost?.toLocaleString()}</td>
											<td style={{ padding: 8, textAlign: "right" }}>LKR {rec.profit?.toLocaleString()}</td>
											<td style={{ padding: 8 }}>{rec.notes}</td>
											<td style={{ padding: 8 }}>
												<button onClick={() => handleEdit(rec)} style={{ marginRight: 8, padding: "4px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer" }}>Edit</button>
												<button onClick={() => handleDelete(rec._id)} style={{ marginRight: 8, padding: "4px 12px", borderRadius: 6, border: "1px solid #e11d48", background: "#fff0f3", color: "#e11d48", cursor: "pointer" }}>Delete</button>
												<button onClick={() => handleDownloadPdf(rec._id)} style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid #2563eb", background: "#eff6ff", color: "#2563eb", cursor: "pointer" }}>Download PDF</button>
											</td>
										</tr>
									))}
									{profits.length === 0 && (
										<tr><td colSpan={9} style={{ textAlign: "center", color: "#888", padding: 16 }}>No profit records saved yet.</td></tr>
									)}
								</tbody>
							</table>
							<div style={{ display: "flex", justifyContent: "center", alignItems: "center", marginTop: 16, gap: 16 }}>
								<button
									onClick={() => setPage(page - 1)}
									disabled={page === 1}
									style={{ padding: "6px 18px", borderRadius: 6, border: "1px solid #cbd5e1", background: page === 1 ? "#f1f5f9" : "#fff", color: "#222", cursor: page === 1 ? "not-allowed" : "pointer" }}
								>Prev</button>
								<span style={{ fontWeight: 600, color: "#222" }}>Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
								<button
									onClick={() => setPage(page + 1)}
									disabled={page * pageSize >= total}
									style={{ padding: "6px 18px", borderRadius: 6, border: "1px solid #cbd5e1", background: page * pageSize >= total ? "#f1f5f9" : "#fff", color: "#222", cursor: page * pageSize >= total ? "not-allowed" : "pointer" }}
								>Next</button>
							</div>
						</div>
		</div>
	);
};

export default Profit;
