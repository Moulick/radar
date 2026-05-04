package server

import (
	"encoding/json"
	"net/http"

	"github.com/skyhook-io/radar/internal/k8s"
	"github.com/skyhook-io/radar/internal/settings"
)

// NamespaceScopeResponse describes the cluster's namespace-scope state.
//
// Fields drive both the namespace-picker UI and the "no full visibility"
// affordances surfaced when the user lacks cluster-wide list access:
//
//   - Active is the currently-selected namespace ("" = cluster-wide).
//   - Mode is "cluster-wide" when no override is set and the user can list
//     namespaces, "namespace" when an override is in effect, or "restricted"
//     when the user can't list namespaces and isn't pinned to one.
//   - AccessibleNamespaces is the picker source. When Authoritative is false
//     it's a best-effort short list (kubeconfig namespace + active override);
//     the UI should hint that other namespaces may exist.
type NamespaceScopeResponse struct {
	Active               string   `json:"active"`
	KubeconfigNamespace  string   `json:"kubeconfigNamespace"`
	Mode                 string   `json:"mode"`
	AccessibleNamespaces []string `json:"accessibleNamespaces"`
	Authoritative        bool     `json:"authoritative"`
}

func (s *Server) handleGetNamespaceScope(w http.ResponseWriter, r *http.Request) {
	if !s.requireConnected(w) {
		return
	}

	active := k8s.GetActiveNamespaceOverride()
	kubeNs := k8s.GetContextNamespace()

	namespaces, authoritative := k8s.GetAccessibleNamespaces(r.Context())

	mode := "cluster-wide"
	switch {
	case active != "":
		mode = "namespace"
	case !authoritative:
		mode = "restricted"
	}

	s.writeJSON(w, NamespaceScopeResponse{
		Active:               active,
		KubeconfigNamespace:  kubeNs,
		Mode:                 mode,
		AccessibleNamespaces: namespaces,
		Authoritative:        authoritative,
	})
}

type setActiveNamespaceRequest struct {
	// Namespace to switch to. Empty string clears the override and falls
	// back to the kubeconfig context's namespace (or no scope if none set).
	Namespace string `json:"namespace"`
}

func (s *Server) handleSetActiveNamespace(w http.ResponseWriter, r *http.Request) {
	if !s.requireConnected(w) {
		return
	}

	var req setActiveNamespaceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "invalid request body: "+err.Error())
		return
	}

	// Stop in-flight sessions for the previous scope. Logs and exec sessions
	// in a namespace we're leaving will dangle otherwise.
	StopAllSessions()

	// Persist BEFORE the switch so a crash mid-switch still preserves intent
	// — next boot will restore the user's pick. Settings save is best-effort;
	// we don't fail the switch on persistence errors (the user can re-pick).
	ctxName := k8s.GetContextName()
	if ctxName != "" {
		_, _ = settings.Update(func(s *settings.Settings) {
			if s.ActiveNamespaces == nil {
				s.ActiveNamespaces = map[string]string{}
			}
			if req.Namespace == "" {
				delete(s.ActiveNamespaces, ctxName)
			} else {
				s.ActiveNamespaces[ctxName] = req.Namespace
			}
		})
	}

	if err := k8s.PerformNamespaceSwitch(req.Namespace); err != nil {
		s.writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Return the fresh scope state so the UI can update without a follow-up GET.
	s.handleGetNamespaceScope(w, r)
}
